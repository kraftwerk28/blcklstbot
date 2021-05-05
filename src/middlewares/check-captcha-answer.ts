import { Composer } from '../composer';
import { captchaHash } from '../utils/event-queue';
import { OnMiddleware } from '../types';
import { botHasSufficientPermissions, isGroupChat } from '../guards';

export const checkCaptchaAnswer = Composer.guardAll(
  [isGroupChat, botHasSufficientPermissions],
  async function (ctx, next) {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const captcha = await ctx.dbStore.hasPendingCaptcha(chatId, userId);
    if (!captcha) {
      return next();
    }
    const correct = captcha.checkAnswer(ctx.message.text);
    await ctx.deleteMessage().catch();
    if (correct) {
      const payload = await ctx.eventQueue.removeEvent<'captcha_timeout'>(
        captchaHash(chatId, userId),
      );
      await ctx.dbStore.deletePendingCaptcha(chatId, userId);
      if (payload) {
        await Promise.all([
          ctx.telegram.deleteMessage(chatId, payload.captchaMessageId),
          ctx.telegram.deleteMessage(chatId, payload.newChatMemberMessageId),
        ]).catch();
      }
    }
  } as OnMiddleware<'text'>,
);
