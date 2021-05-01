import { Telegraf } from 'telegraf';
import IoRedis from 'ioredis';
import { config } from 'dotenv';

import { EventQueue } from '../src/event-queue';
import { BaseEvent } from '../src/types';

type PongEvent = BaseEvent<'pong', { chatId: number; messageId: number }>;
type RemindEvent = BaseEvent<
  'remind',
  {
    chatId: number;
    userId: number;
    text: string;
  }
>;

type Event = PongEvent | RemindEvent;

async function main() {
  config();

  // const bot = new Telegraf(process.env.BOT_TOKEN!);
  // const redisClient = new IoRedis();
  // const eventQueue = new EventQueue<Event>(
  //   redisClient,
  //   bot.telegram,
  // );
  // const botUser = await bot.telegram.getMe();

  // const pingRegex = new RegExp(
  //   String.raw`^\/ping(?:@${botUser.username})?\s+(\d+)$`,
  // );
  // bot.hears(pingRegex, async (ctx, next) => {
  //   const seconds = parseInt(ctx.match[1]);
  //   if (isNaN(seconds)) {
  //     return next();
  //   }
  //   eventQueue.pushDelayed(seconds, 'pong', {
  //     chatId: ctx.chat.id,
  //     messageId: ctx.message.message_id,
  //   });
  // });

  // const remindRegex = new RegExp(
  //   String.raw`^\/remind(?:@${botUser.username})?\s+(\d+)\s+(.+)\s*$`,
  // );

  // bot.hears(remindRegex, async (ctx, next) => {
  //   const seconds = parseInt(ctx.match[1]);
  //   const text = ctx.match[2];
  //   if (isNaN(seconds)) {
  //     return next();
  //   }
  //   eventQueue.pushDelayed(seconds, 'remind', {
  //     chatId: ctx.chat.id,
  //     userId: ctx.from.id,
  //     text,
  //   });
  // });

  // eventQueue
  //   .on('pong', async ({ payload }) => {
  //     await bot.telegram.sendMessage(payload.chatId, 'Pong', {
  //       reply_to_message_id: payload.messageId,
  //       allow_sending_without_reply: true,
  //     });
  //   })
  //   .on('remind', async ({ payload }) => {
  //     const chatMember = await bot.telegram.getChatMember(
  //       payload.chatId,
  //       payload.userId,
  //     );
  //     const msgText = `@${chatMember.user.username} ${payload.text}`;
  //     await bot.telegram.sendMessage(payload.chatId, msgText);
  //   })
  //   .onError(async (error) => {
  //   });

  // bot.launch();

  // process.on('SIGINT', () => {
  //   console.log('Stopping');
  //   redisClient.disconnect();
  //   bot.stop();
  //   process.exit(0);
  // });
}

main().catch(console.error);
