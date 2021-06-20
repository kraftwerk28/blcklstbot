import { DEFAULT_CAPCHA_MODES } from '../constants';
import { ActionMiddleware, CaptchaMode, DbChat } from '../types';
import { noop, settingsKeyboard } from '../utils';

const toggleableProps: (keyof DbChat)[] = [
  'delete_joins',
  'delete_slash_commands',
  'enable_cas',
  'propagate_bans',
  'upload_to_gist',
];

export const updateChatSetting: ActionMiddleware = async function (ctx) {
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
      await ctx.answerCbQuery(`Updated "${prop}"`);
      break;
    }

    case prop === 'dec_timeout': {
      let timeout = ctx.dbChat.captcha_timeout - 30;
      if (timeout < 30) {
        timeout = 30;
      }
      await ctx.dbStore.updateChatProp(chat.id, 'captcha_timeout', timeout);
      await ctx.answerCbQuery(`Updated "${prop}"`);
      break;
    }

    case prop === 'inc_timeout': {
      let timeout = ctx.dbChat.captcha_timeout + 30;
      if (timeout > 60 * 10) {
        timeout = 60 * 30;
      }
      await ctx.dbStore.updateChatProp(chat.id, 'captcha_timeout', timeout);
      await ctx.answerCbQuery(`Updated "${prop}"`);
      break;
    }

    case toggleableProps.includes(prop as keyof DbChat): {
      const chatProp = prop as keyof DbChat;
      await ctx.dbStore.updateChatProp(
        chat.id,
        chatProp,
        !ctx.dbChat[chatProp],
      );
      await ctx.answerCbQuery(`Updated "${prop}"`);
      break;
    }

    default:
      await ctx.answerCbQuery('¯_(ツ)_/¯');
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
};
