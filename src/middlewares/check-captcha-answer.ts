import { Composer } from 'telegraf';

import { captchaHash } from '../utils/event-queue';
import { OnMiddleware } from '../types';
import { botHasSufficientPermissions, isGroupChat } from '../guards';
import { all } from '../utils';

export const checkCaptchaAnswer = Composer.optional(
  all(isGroupChat, botHasSufficientPermissions),
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
