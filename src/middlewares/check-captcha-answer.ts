import { Composer } from '../composer';
import { captchaHash } from '../utils/event-queue';
import { OnMiddleware } from '../types';
import { botHasSufficientPermissions, isGroupChat } from '../guards';

export const checkCaptchaAnswer = Composer.guardAll(
  [isGroupChat, botHasSufficientPermissions],
  async function(ctx, next) {
    const captcha = await ctx.dbStore.hasPendingCaptcha(
      ctx.chat.id,
      ctx.from.id,
    );
    if (!captcha) {
      return next();
    }
    const correct = captcha.checkAnswer(ctx.message.text);
    await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
    if (correct) {
      const payload = await ctx.eventQueue.removeEvent<'captcha_timeout'>(
        captchaHash(ctx.chat.id, ctx.from.id),
      );
      if (payload) {
        await Promise.allSettled([
          ctx.telegram.deleteMessage(ctx.chat.id, payload.captchaMessageId),
          ctx.telegram.deleteMessage(
            ctx.chat.id,
            payload.newChatMemberMessageId,
          ),
        ]);
      }
    }
  } as OnMiddleware<'text'>,
);
