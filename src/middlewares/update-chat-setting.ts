import { Composer } from '../composer';
import { CHAT_LANGUAGES, DEFAULT_CAPCHA_MODES } from '../constants';
import { isGroupChat, senderIsAdmin } from '../guards';
import {
  ActionMiddleware,
  CaptchaMode,
  DbChat,
  KeysWhichMapTo,
} from '../types';
import { noop, settingsKeyboard } from '../utils';

const toggleableProps: KeysWhichMapTo<DbChat, boolean>[] = [
  'delete_joins',
  'delete_slash_commands',
  'enable_cas',
  'propagate_bans',
  'upload_to_gist',
];

const captchaTimeoutSettings = [30, 60, 90, 2 * 60, 3 * 60, 5 * 60, 10 * 60];

function increaseTimeout(current: number) {
  let i = captchaTimeoutSettings.findIndex(t => t >= current) + 1;
  if (i > captchaTimeoutSettings.length - 1) {
    i = captchaTimeoutSettings.length - 1;
  }
  return captchaTimeoutSettings[i];
}

function decreaseTimeout(current: number) {
  let i = captchaTimeoutSettings.findIndex(t => t >= current) - 1;
  if (i < 0) {
    i = 0;
  }
  return captchaTimeoutSettings[i];
}

export const updateChatSetting = Composer.branch(
  Composer.allOf(isGroupChat, senderIsAdmin),
  async function (ctx) {
    const [, prop] = ctx.match;
    const chat = ctx.callbackQuery.message?.chat;
    if (!chat) return;

    switch (true) {
      case DEFAULT_CAPCHA_MODES.includes(prop as CaptchaMode): {
        const mode = prop as CaptchaMode;
        const newModes = new Set(ctx.dbChat.captcha_modes);
        if (newModes.has(mode)) {
          newModes.delete(mode);
        } else {
          newModes.add(mode);
        }
        await ctx.dbStore.updateChatProp(
          chat.id,
          'captcha_modes',
          Array.from(newModes),
        );
        await ctx.answerCbQuery(`Updated settings!`);
        break;
      }

      case prop === 'dec_timeout': {
        await ctx.dbStore.updateChatProp(
          chat.id,
          'captcha_timeout',
          decreaseTimeout(ctx.dbChat.captcha_timeout),
        );
        await ctx.answerCbQuery(`Decreased captcha timeout`);
        break;
      }

      case prop === 'inc_timeout': {
        await ctx.dbStore.updateChatProp(
          chat.id,
          'captcha_timeout',
          increaseTimeout(ctx.dbChat.captcha_timeout),
        );
        await ctx.answerCbQuery(`Increased captcha timeout`);
        break;
      }

      case toggleableProps.includes(prop as keyof DbChat): {
        const chatProp = prop as keyof DbChat;
        await ctx.dbStore.updateChatProp(
          chat.id,
          chatProp,
          !ctx.dbChat[chatProp],
        );
        await ctx.answerCbQuery(`Updated settings!`);
        break;
      }

      case prop === 'close': {
        const messageId = await ctx.dbStore.getPendingSettingsMessage(chat.id);
        if (messageId === undefined) return;
        await ctx.tg.deleteMessage(chat.id, messageId).catch(noop);
        await ctx.answerCbQuery('Where did it go?');
        return;
      }

      case prop === 'change_language': {
        const curIndex = CHAT_LANGUAGES.findIndex(
          l => l === ctx.dbChat.language_code,
        );
        const nextLanguage =
          CHAT_LANGUAGES[(curIndex + 1) % CHAT_LANGUAGES.length];
        await ctx.dbStore.updateChatProp(
          chat.id,
          'language_code',
          nextLanguage,
        );
        await ctx.answerCbQuery('Updated language!');
        break;
      }

      default:
        await ctx.answerCbQuery('Damn dude');
        return;
    }

    const newChat = await ctx.dbStore.getChat(chat.id);
    const messageId = await ctx.dbStore.getPendingSettingsMessage(chat.id);
    if (messageId !== undefined) {
      await ctx.tg
        .editMessageReplyMarkup(
          chat.id,
          messageId,
          undefined,
          settingsKeyboard(newChat!),
        )
        .catch(noop);
    }
  } as ActionMiddleware,
  async ctx => {
    await ctx.answerCbQuery('You are not permitted to change chat settings', {
      show_alert: true,
    });
  },
);
