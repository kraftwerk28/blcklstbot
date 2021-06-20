import { Telegraf } from 'telegraf';
import util from 'util';
import * as path from 'path';

import { Composer } from './composer';
import { Ctx, TranslateFn } from './types';
import { extendBotContext } from './extend-context';
import { initLogger, log } from './logger';
import { loadLocales, noop, regexp, runI18n } from './utils';
import * as middlewares from './middlewares';
import * as commands from './commands';
import { getCaptchaMessage } from './captcha';
import { CAPTCHA_MESSAGE_UPDATE_INTERVAL } from './constants';

async function main() {
  if (process.env.NODE_ENV === 'development') {
    const dotenv = await import('dotenv');
    dotenv.config({ path: path.resolve('.env.dev') });
  }
  initLogger();
  const bot = new Telegraf<Ctx>(process.env.BOT_TOKEN!);

  async function shutdownHandler(signal: NodeJS.Signals) {
    log.info(`Handling ${signal}...`);
    try {
      await bot.context.dbStore?.shutdown();
      bot.context.eventQueue?.dispose();
      process.exit(0);
    } catch (err) {
      log.error(err);
      process.exit(1);
    }
  }
  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);

  bot.telegram.webhookReply = false;
  const locales = await loadLocales();
  await extendBotContext(bot, locales);
  const botInfo = await bot.telegram.getMe();
  bot.botInfo ??= botInfo;
  const username = botInfo.username;

  bot
    .use(new Composer())
    .use(middlewares.getDbChat)
    .on('message', middlewares.addUserToDatabase)
    .on('message', middlewares.trackMemberMessages)
    .on('message', middlewares.checkCasBan)
    .on('text', middlewares.substitute)
    .on('text', middlewares.highlightCode)
    .on('text', middlewares.checkCaptchaAnswer)
    .on('text', middlewares.uploadToGistOrHighlight)
    .on(['chat_member', 'new_chat_members'], middlewares.onNewChatMember)
    .on('left_chat_member', middlewares.leftChatMember)
    .on('inline_query', middlewares.docSearch)
    .on('chosen_inline_result', middlewares.onChosenInlineResult)
    .hears(regexp`^\/ping(?:@${username})?\s+(\d+)(?:\s+(.+))?$`, commands.ping)
    .hears(regexp`^\/codepic(?:@${username})?(?:\s+(\w+))?$`, commands.codePic)
    .hears(
      regexp`^\/captcha(?:@${username})?((?:\s+[\w-]+)+)?\s*$`,
      commands.captcha,
    )
    .hears(
      regexp`^\/captcha_timeout(?:@${username})?\s+(\d+)$`,
      commands.captchaTimeout,
    )
    .hears(regexp`^\/report(?:@${username})?(?:\s+(.+))?$`, commands.report)
    .hears(regexp`^\/warn(?:@${username})?(?:\s+(.+))?$`, commands.warn)
    .hears(
      regexp`^\/language(?:@${username})?\s+(\w{2})$`,
      commands.setLanguage,
    )
    .hears(
      regexp`^\/(un)?def(global)?(?:@${username})?\s+(\w+)$`,
      commands.defMessage,
    )
    .hears(regexp`^!(\w+)$`, commands.bangHandler)
    .start(commands.start)
    .command('rules', commands.rules)
    .command('settings', commands.groupSettings)
    .command('help', commands.help)
    .command('del', commands.delMessage)
    .command('delete_joins', commands.deleteJoins)
    .command('replace_code', commands.replaceCode)
    .command('banlist', commands.banList)
    .command('gist', commands.manualGist)
    .command('dbg', commands.dbg)
    .action(/^unban:([\d-]+):([\d-]+)$/, middlewares.undoBan)
    .action(/^setting:(\w+)$/, middlewares.updateChatSetting)
    .catch((err, ctx) => {
      log.error('Error in bot::catch; update');
      log.error(ctx.update);
      log.error(err as Error);
    });

  bot.context
    .eventQueue!.on('pong', async ({ telegram, payload }) => {
      let text = payload.text ?? 'Pong';
      await telegram.sendMessage(payload.chatId, text, {
        reply_to_message_id: payload.messageId,
      });
    })
    .on('captcha_timeout', async ({ telegram, payload }) => {
      const {
        chatId,
        userId,
        captchaMessageId,
        newChatMemberMessageId,
      } = payload;
      await telegram.kickChatMember(chatId, userId);
      await telegram.unbanChatMember(chatId, userId);
      await telegram.deleteMessage(chatId, captchaMessageId).catch(noop);
      await telegram.deleteMessage(chatId, newChatMemberMessageId).catch(noop);
      // TODO: captcha cooldown
    })
    .on('delete_message', async ({ telegram, payload }) => {
      await telegram
        .deleteMessage(payload.chatId, payload.messageId)
        .catch(noop);
    })
    .on('update_captcha', async ({ telegram, payload, dbStore }) => {
      const { chatId, userId, messageId, chatLocale } = payload;
      const now = Math.floor(Date.now() / 1000);
      const pendingCaptcha = await dbStore.getPendingCaptcha(chatId, userId);
      if (!pendingCaptcha) return;
      const remainingSeconds = pendingCaptcha.deadline - now;
      const t: TranslateFn = (s, replacements = {}) => {
        return runI18n(locales, chatLocale, s, replacements);
      };
      const chatMember = await telegram.getChatMember(chatId, userId);
      const { text, keyboard } = getCaptchaMessage(
        t,
        pendingCaptcha,
        chatMember.user,
        remainingSeconds,
      );
      await telegram.editMessageText(chatId, messageId, undefined, text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      if (remainingSeconds > CAPTCHA_MESSAGE_UPDATE_INTERVAL) {
        bot.context.eventQueue?.pushDelayed(
          CAPTCHA_MESSAGE_UPDATE_INTERVAL,
          'update_captcha',
          payload,
        );
      }
    });

  await bot.telegram.setMyCommands(commands.publicCommands);

  switch (process.env.NODE_ENV) {
    case 'development':
      log.info('Launching in polling mode');
      await bot.launch({ dropPendingUpdates: true });
      break;
    case 'production': {
      log.info('Launching in webhook mode');
      const {
        WEBHOOK_PATH,
        WEBHOOK_DOMAIN,
        WEBHOOK_PORT,
        SERVER_PORT,
      } = process.env;
      await bot.launch({
        dropPendingUpdates: true,
        webhook: {
          hookPath: WEBHOOK_PATH,
          domain: `${WEBHOOK_DOMAIN}:${WEBHOOK_PORT}`,
          port: parseInt(SERVER_PORT!),
        },
      });
      break;
    }
    default:
      log.error('NODE_ENV must be defined');
      process.exit(1);
  }
}

main().catch((err) => {
  log.error(err, 'Error in `::main`');
});
