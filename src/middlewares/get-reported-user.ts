import { CommandContext, Filter, MiddlewareFn } from "grammy";
import { Context, DbUser } from "../types/index.js";
import { USERS_TABLE_NAME } from "../constants.js";

const middleware: MiddlewareFn<
  Filter<CommandContext<Context>, "message">
> = async (ctx, next) => {
  if (ctx.reportedUser !== undefined) return next();
  let dbUser: DbUser | undefined;
  if (ctx.message.reply_to_message?.from) {
    const { from } = ctx.message.reply_to_message;
    dbUser = await ctx.dbStore.getUser(ctx.chat.id, from.id);
  } else {
    const maybeUserId = parseInt(ctx.match);
    if (!Number.isNaN(maybeUserId)) {
      dbUser = await ctx.dbStore.getUser(ctx.chat.id, parseInt(ctx.match));
    }
    if (ctx.match && !dbUser) {
      dbUser = await ctx.dbStore
        .knex<DbUser>(USERS_TABLE_NAME)
        .where({ username: ctx.match.replace(/^@/, "") })
        .orWhere(
          ctx.dbStore.knex.raw(
            "trim(first_name || ' ' || coalesce(last_name, '')) = ?",
            ctx.match,
          ),
        )
        .first();
    }
  }
  const logData = {
    text: ctx.message.text,
    reply: ctx.message.reply_to_message,
    db_user: dbUser,
  };
  if (dbUser) {
    ctx.log.info(logData, "Resolved reported user");
  } else {
    ctx.log.warn(logData, "Could not resolve reported user");
    return;
  }
  ctx.reportedUser = dbUser;
  return next();
};

export default middleware;
