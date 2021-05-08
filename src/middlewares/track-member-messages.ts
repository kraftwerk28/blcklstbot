import { Composer } from 'telegraf';
import { OnMiddleware } from '../types';
import { isGroupChat } from '../guards';

export const trackMemberMessages = Composer.optional(
  isGroupChat,
  async function (ctx, next) {
    await ctx.dbStore.addUserMessage(ctx.message);
    return next();
  } as OnMiddleware<'message'>,
);
