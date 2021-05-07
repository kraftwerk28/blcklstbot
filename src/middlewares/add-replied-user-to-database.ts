import { Middleware } from 'telegraf';
import { Ctx } from '../types';
type Mw = Middleware<Ctx & { match?: RegExpExecArray }>;

/** Gets user from all of `/warn`, `/ban` and "Pardon" click */
export const addRepliedUserToDatabase: Mw = async function(ctx, next) {
  if (ctx.reportedUser) return next();
  if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.match) {
    const userId = parseInt(ctx.match[2], 10);
    ctx.reportedUser = await ctx.dbStore.getUser(userId);
    return next();
  } else if (ctx.message) {
    if (!('reply_to_message' in ctx.message)) return next();
    const user = ctx.message.reply_to_message?.from;
    if (!user) return next();
    const { id, username, first_name, last_name, language_code } = user;
    const addedUser = await ctx.dbStore.addUser({
      id,
      first_name,
      last_name,
      username,
      language_code,
    });
    ctx.reportedUser = addedUser;
    return next();
  }
};
