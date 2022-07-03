import { Composer } from "../composer";
import { OnMiddleware } from "../types";
import { isGroupChat } from "../guards";

export const addUserToDatabase: OnMiddleware<"message"> = Composer.optional(
  isGroupChat,
  async function (ctx, next) {
    await ctx.dbStore.addUser(ctx.from, ctx.chat.id);
    return next();
  } as OnMiddleware<"message">,
);
