import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { Ctx } from './types';
import { extendBotContext } from './extend-context';
import { initLogger, log } from './logger';

import * as middleware from './middlewares';

async function main() {
  dotenv.config();
  initLogger();
  const bot = new Telegraf<Ctx>(process.env.BOT_TOKEN!);
  await extendBotContext(bot);
  const botInfo = await bot.telegram.getMe();

  bot
    .on('chat_member', middleware.onNewChatMember)
    .on('new_chat_members', middleware.onNewChatMember)
    .hears(
      new RegExp(
        String.raw`\/ping(?:@${botInfo.username})?\s+(\d+)(?:\s+(.+))?$`
      ),
      async (ctx, next) => {
        const seconds = parseInt(ctx.match[1]);
        const payload = {
          chatId: ctx.chat.id,
          text: ctx.match[2],
          time: seconds,
          messageId: ctx.message.message_id,
        };
        ctx.eventQueue.pushDelayed(seconds, 'pong', payload);
      }
    );

  bot.context.eventQueue!
    .on('pong', async ({ telegram, payload }) => {
      let text = payload.text ?? 'Pong';
      await telegram.sendMessage(payload.chatId, text, {
        reply_to_message_id: payload.messageId
      });
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
