import { Composer } from 'telegraf';
import { OnMiddleware } from '../types';
import { isGroupChat } from '../guards';

export const trackMemberMessages = Composer.optional(
  isGroupChat,
  async function (ctx, next) {
    if ('new_chat_members' in ctx.message || 'left_chat_member' in ctx.message)
      return next();
    await ctx.dbStore.addUserMessage(ctx.message);
    return next();
  } as OnMiddleware<'message'>,
);
