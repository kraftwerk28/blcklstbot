import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

import { Ctx } from './types';
import { extendBotContext } from './extend-context';
import { initLogger, log } from './logger';
import { regexp } from './utils';
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
    .on('message', middlewares.getDbChat)
    .on('text', middlewares.checkCaptchaAnswer)
    .on(
      ['chat_member', 'new_chat_members'],
      middlewares.botHasSufficientPermissions,
      middlewares.onNewChatMember,
    )
    .on('left_chat_member', middlewares.leftChatMember)
    .hears(regexp`^\/ping(?:@${username})?\s+(\d+)(?:\s+(.+))?$`, commands.ping)
    .hears(
      regexp`^\/captcha(?:@${username})?((?:\s+[\w-]+)+)?\s*$`,
      commands.captcha,
    )
    .command('rules', middlewares.senderIsAdmin, commands.rules)
    .command('settings', middlewares.senderIsAdmin, commands.groupSettings)
    .catch((err) => {
      log.error('Error in `bot.catch`:', err);
    });

  await bot.telegram.setMyCommands(commands.publicCommands);

  bot.context
    .eventQueue!.on('pong', async ({ telegram, payload }) => {
      let text = payload.text ?? 'Pong';
      await telegram.sendMessage(payload.chatId, text, {
        reply_to_message_id: payload.messageId,
      });
    })
    .on('captcha_timeout', async ({ telegram, payload }) => {
      await telegram.sendMessage(
        payload.chatId,
        `User ${payload.userId} must be banned because of missed captcha.`,
      );
      await telegram.deleteMessage(payload.chatId, payload.captchaMessageId);
    })
    .on('delete_message', async ({ telegram, payload }) => {
      await telegram.deleteMessage(payload.chatId, payload.messageId).catch();
    });

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
  log.error('Error in `main`:', err);
});
