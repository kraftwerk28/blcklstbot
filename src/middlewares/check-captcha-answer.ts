import { captchaHash } from '../utils/event-queue';
import { OnMiddleware } from '../types';

type Middleware = OnMiddleware<'text'>;

export const checkCaptchaAnswer: Middleware = async function(ctx, next) {
  const captcha = await ctx.dbStore.hasPendingCaptcha(ctx.chat.id, ctx.from.id);
  if (!captcha) {
    return next();
  }
  const correct = captcha.checkAnswer(ctx.message.text);
  await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
  if (correct) {
    const hash = captchaHash(ctx.chat.id, ctx.from.id);
    const payload = await ctx.eventQueue.removeEvent<'captcha_timeout'>(hash);
    if (payload) {
      await ctx.telegram.deleteMessage(ctx.chat.id, payload.captchaMessageId);
    }
  }
};
