import { Composer } from "../composer.js";
import { botHasSufficientPermissions } from "../guards/index.js";
import { noop } from "../utils/index.js";

const composer = new Composer();

export default composer;

composer
  .on("message")
  .chatType(["group", "supergroup"])
  .use(botHasSufficientPermissions, async (ctx, next) => {
    // Text messages are already handled by other middleware
    if ("text" in ctx.message) {
      return next();
    }
    const captcha = await ctx.dbStore.hasPendingCaptcha(
      ctx.chat.id,
      ctx.from.id,
    );
    if (captcha) {
      await ctx.deleteMessage().catch(noop);
    }
    return next();
  });
