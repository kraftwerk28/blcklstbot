import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

import { Ctx } from './types';
import { extendBotContext } from './extend-context';
import { initLogger, log } from './logger';
import * as middleware from './middlewares';
import * as commands from './commands';
import { regexp } from './utils';

async function main() {
  dotenv.config();
  initLogger();

  const bot = new Telegraf<Ctx>(process.env.BOT_TOKEN!);
  bot.telegram.webhookReply = false;
  await extendBotContext(bot);
  bot.botInfo = await bot.telegram.getMe();
  const username = bot.botInfo.username;

  bot
    .on(['chat_member', 'new_chat_members'], middleware.onNewChatMember)
    .hears(
      regexp`\/ping(?:${username})?\s+(\d+)(?:\s+(.+))?$`,
      commands.ping,
    );

  await bot.telegram.setMyCommands(commands.publicCommands);

  bot.context.eventQueue!
    .on('pong', async ({ telegram, payload }) => {
      let text = payload.text ?? 'Pong';
      await telegram.sendMessage(payload.chatId, text, {
        reply_to_message_id: payload.messageId
      });
    })
    .on('captcha_timeout', async ({ telegram, payload }) => {
      await telegram.sendMessage(
        payload.chatId,
        `User ${payload.userId} must be banned because of missed captcha.`,
      );
      await telegram.deleteMessage(payload.chatId, payload.captchaMessageId);
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

main();
