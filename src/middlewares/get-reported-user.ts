import { CommandContext, Filter, MiddlewareFn } from "grammy";
import { Context, DbUser } from "../types/index.js";
import { USERS_TABLE_NAME } from "../constants.js";

const middleware: MiddlewareFn<
  Filter<CommandContext<Context>, "message">
> = async (ctx, next) => {
  if (ctx.reportedUser !== undefined) return next();
  let dbUser: DbUser | undefined;
  if (ctx.match.startsWith("@")) {
    dbUser = await ctx.dbStore
      .knex<DbUser>(USERS_TABLE_NAME)
      .where({ username: ctx.match.slice(1) })
      .first();
  } else if (!Number.isNaN(parseInt(ctx.match))) {
    dbUser = await ctx.dbStore.getUser(ctx.chat.id, parseInt(ctx.match));
  } else if (ctx.message.reply_to_message?.from) {
    const { from } = ctx.message.reply_to_message;
    dbUser = await ctx.dbStore.getUser(ctx.chat.id, from.id);
  }
  if (!dbUser) return;
  ctx.reportedUser = dbUser;
  return next();
};

export default middleware;
