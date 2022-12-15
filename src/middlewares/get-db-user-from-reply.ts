import { Middleware } from "telegraf";
import { Ctx } from "../types";

type Mw = Middleware<Ctx & { match?: RegExpExecArray }>;

/** Gets user from all of `/warn`, `/ban` and "Pardon" click */
export const getDbUserFromReply: Mw = async function (ctx, next) {
  const chatId = ctx.chat?.id;
  if (ctx.reportedUser || typeof chatId !== "number") return next();
  if (ctx.callbackQuery && "data" in ctx.callbackQuery && ctx.match) {
    ctx.reportedUser = await ctx.dbStore.getUser(
      chatId,
      parseInt(ctx.match[2], 10),
    );
    // const userId = parseInt(ctx.match[2], 10);
    // ctx.reportedUser = await ctx.dbStore.getUser(userId);
  } else if (
    ctx.message &&
    "reply_to_message" in ctx.message &&
    ctx.message.reply_to_message?.from
  ) {
    ctx.reportedUser = await ctx.dbStore.addUser(
      ctx.message.reply_to_message.from,
      chatId,
    );
  }
  return next();
};
