import { Composer } from 'telegraf';
import { botHasSufficientPermissions, isGroupChat } from '../guards';
import { OnMiddleware } from '../types';
import { all } from '../utils';

export const removeMessagesUnderCaptcha = Composer.optional(
  all(isGroupChat, botHasSufficientPermissions),
  async function(ctx, next) {
    // Text messages are already handled by other middleware
    if ('text' in ctx.message) {
      return next();
    }
    const captcha = await ctx.dbStore.hasPendingCaptcha(
      ctx.chat.id,
      ctx.from.id,
    );
    if (captcha) {
      await ctx.deleteMessage();
    }
    return next();
  } as OnMiddleware<'message'>,
);
