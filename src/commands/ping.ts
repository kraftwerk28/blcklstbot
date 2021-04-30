import { HearsMiddleware } from '../types';

export const ping: HearsMiddleware = async (ctx, next) => {
  const seconds = parseInt(ctx.match[1]);
  const payload = {
    chatId: ctx.chat.id,
    text: ctx.match[2],
    time: seconds,
    messageId: ctx.message.message_id,
  };
  ctx.eventQueue.pushDelayed(seconds, 'pong', payload);
}
