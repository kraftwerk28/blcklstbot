import { Telegraf } from 'telegraf';
import util from 'util';
import dotenv from 'dotenv';

import { Composer } from './composer';
import { Ctx } from './types';
import { extendBotContext } from './extend-context';
import { initLogger, log } from './logger';
import { regexp, safePromiseAll } from './utils';
import * as middlewares from './middlewares';
import * as commands from './commands';

async function main() {
  if (process.env.NODE_ENV === 'development') {
    dotenv.config();
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
  await extendBotContext(bot);
  const botInfo = await bot.telegram.getMe();
  bot.botInfo ??= botInfo;
  const username = botInfo.username;
  const composer2 = new Composer();

  bot
    .use(composer2)
    .use(middlewares.getDbChat)
    .on('message', middlewares.addUserToDatabase)
    .on('message', middlewares.trackMemberMessages)
    .on('text', middlewares.substitute)
    .on('text', middlewares.highlightCode)
    .on('text', middlewares.checkCaptchaAnswer)
    .on('text', middlewares.uploadToGistOrHighlight)
    .on(['chat_member', 'new_chat_members'], middlewares.onNewChatMember)
    .on('left_chat_member', middlewares.leftChatMember)
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
    .command('rules', commands.rules)
    .command('settings', commands.groupSettings)
    .command('help', commands.help)
    .command('del', commands.delMessage)
    .command('delete_joins', commands.deleteJoins)
    .command('replace_code', commands.replaceCode)
    .command('banlist', commands.banList)
    .action(/^unban:([\d-]+):([\d-]+)$/, middlewares.undoBan)
    .catch((err, ctx) => {
      log.error(
        'Error in `bot::catch`\nUpdate: %s\nError: %O',
        util.inspect(ctx.update, { colors: true, depth: null }),
        err,
      );
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
      await telegram.deleteMessage(chatId, captchaMessageId).catch();
      await telegram.deleteMessage(chatId, newChatMemberMessageId).catch();
    })
    .on('delete_message', async ({ telegram, payload }) => {
      await telegram.deleteMessage(payload.chatId, payload.messageId).catch();
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
  log.error('Error in `::main`:', err);
});
