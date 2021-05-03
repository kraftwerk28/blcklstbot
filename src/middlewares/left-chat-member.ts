import { captchaHash } from '../utils/event-queue';
import { OnMiddleware } from '../types';

type Middleware = OnMiddleware<'left_chat_member' | 'chat_member'>;

export const leftChatMember: Middleware = async function(ctx, next) {
  if (ctx.message?.left_chat_member) {
    const hash = captchaHash(ctx.chat.id, ctx.message.left_chat_member.id);
    const payload = await ctx.eventQueue.removeEvent<'captcha_timeout'>(hash);
    if (payload) {
      ctx.telegram.deleteMessage(ctx.chat.id, payload.captchaMessageId);
    }
  }
  return next();
};
