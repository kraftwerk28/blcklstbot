import { Composer } from "../composer";
import { botHasSufficientPermissions, isGroupChat } from "../guards";
import { OnMiddleware } from "../types";

export const removeMessagesUnderCaptcha = Composer.guardAll(
  [isGroupChat, botHasSufficientPermissions],
  async function (ctx, next) {
    // Text messages are already handled by other middleware
    if ("text" in ctx.message) {
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
  } as OnMiddleware<"message">,
);
