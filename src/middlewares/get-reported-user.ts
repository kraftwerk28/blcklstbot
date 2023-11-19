import { CommandContext, Filter, MiddlewareFn } from "grammy";
import { Context, DbUser } from "../types/index.js";
import { USERS_TABLE_NAME } from "../constants.js";

const middleware: MiddlewareFn<
  Filter<CommandContext<Context>, "message">
> = async (ctx, next) => {
  if (ctx.reportedUser !== undefined) return next();
  // ctx.remainingArgs = ctx.match.split(/\s+/).filter(Boolean);
  if (ctx.message.reply_to_message?.from) {
    const { from } = ctx.message.reply_to_message;
    ctx.reportedUser = await ctx.dbStore.getUser(ctx.chat.id, from.id);
  } else if (ctx.commandArgs.length) {
    const userIdentifier = ctx.commandArgs.shift()!;
    const maybeUserId = parseInt(userIdentifier);
    if (!Number.isNaN(maybeUserId)) {
      ctx.reportedUser = await ctx.dbStore.getUser(ctx.chat.id, maybeUserId);
    }
    if (!ctx.reportedUser) {
      ctx.reportedUser = await ctx.dbStore
        .knex<DbUser>(USERS_TABLE_NAME)
        .where({ username: userIdentifier.replace(/^@/, "") })
        .orWhere(
          ctx.dbStore.knex.raw(
            "trim(first_name || ' ' || coalesce(last_name, '')) = ?",
            userIdentifier,
          ),
        )
        .first();
    }
  }
  if (ctx.reportedUser) {
    ctx.log.info(
      {
        text: ctx.message.text,
        reply: ctx.message.reply_to_message,
        reported_user: ctx.reportedUser,
      },
      "Resolved reported user",
    );
    return next();
  } else {
    ctx.log.warn(
      { text: ctx.message.text, reply: ctx.message.reply_to_message },
      "Could not resolve reported user",
    );
  }
};

export default middleware;
