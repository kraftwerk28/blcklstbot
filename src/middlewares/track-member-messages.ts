import { Composer } from 'telegraf';
import { OnMiddleware } from '../types';
import { isGroupChat } from '../guards';

export const trackMemberMessages = Composer.optional(
  isGroupChat,
  async function(ctx, next) {
    const { chat, from, message } = ctx;
    await ctx.dbStore.trackMessage(chat.id, from.id, message.message_id);
    return next();
  } as OnMiddleware<'message'> ,
);
