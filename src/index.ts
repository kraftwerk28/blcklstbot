import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

import { Ctx } from './types';
import { extendBotContext } from './extend-context';
import { initLogger, log } from './logger';
import { regexp, runDangling } from './utils';
import * as middlewares from './middlewares';
import * as commands from './commands';

async function main() {
  dotenv.config();
  initLogger();

  const bot = new Telegraf<Ctx>(process.env.BOT_TOKEN!);
  bot.telegram.webhookReply = false;
  await extendBotContext(bot);
  const botInfo = await bot.telegram.getMe();
  bot.botInfo ??= botInfo;
  const username = botInfo.username;

  bot
    .use(middlewares.getDbChat)
    .on('message', middlewares.removeMessagesUnderCaptcha)
    .on('text', middlewares.checkCaptchaAnswer)
    .on(['chat_member', 'new_chat_members'], middlewares.onNewChatMember)
    .on('left_chat_member', middlewares.leftChatMember)
    .hears(regexp`^\/ping(?:@${username})?\s+(\d+)(?:\s+(.+))?$`, commands.ping)
    .hears(
      regexp`^\/captcha(?:@${username})?((?:\s+[\w-]+)+)?\s*$`,
      commands.captcha,
    )
    .command('rules', commands.rules)
    .command('settings', commands.groupSettings)
    .command('help', commands.help)
    .command('beautify_code', commands.beautifyCode)
    .hears(
      regexp`^\/captcha_timeout(?:@${username})?\s+(\d+)$`,
      commands.captchaTimeout,
    )
    .command('del', commands.delMessage)
    .catch((err) => {
      log.error('Error in `bot::catch`:', err);
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
      runDangling([
        telegram.kickChatMember(chatId, userId),
        telegram.unbanChatMember(chatId, userId),
        telegram.deleteMessage(chatId, captchaMessageId),
        telegram.deleteMessage(chatId, newChatMemberMessageId),
      ]);
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

  async function shutdownHandler(signal: NodeJS.Signals) {
    log.info(`Handling ${signal}...`);
    try {
      await bot.context.dbStore?.shutdown();
      process.exit(0);
    } catch (err) {
      log.error(err);
      process.exit(1);
    }
  }

  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);
}

main().catch((err) => {
  log.error('Error in `::main`:', err);
});
