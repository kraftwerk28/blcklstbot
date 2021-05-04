import { HearsMiddleware } from '../types';
import { MIN_CAPTCHA_TIMEOUT, MAX_CAPTCHA_TIMEOUT } from '../constants';

export const captchaTimeout: HearsMiddleware = async (ctx) => {
  const seconds = parseInt(ctx.match[1]);
  const replyOptions = { reply_to_message_id: ctx.message.message_id };
  if (seconds < MIN_CAPTCHA_TIMEOUT) {
    return ctx.reply('Timeout must be at least ${}s.', replyOptions);
  }
  if (seconds > MAX_CAPTCHA_TIMEOUT) {
    return ctx.reply('Timeout can be at most ${}s.', replyOptions);
  }
  await ctx.dbStore.updateChatProp(ctx.chat.id, 'captcha_timeout', seconds);
}
