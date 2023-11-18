import { Composer } from "../composer.js";

const composer = new Composer();

export default composer;

composer
  .on("message")
  .chatType(["group", "supergroup"])
  .use(async (ctx, next) => {
    if ("new_chat_members" in ctx.message || "left_chat_member" in ctx.message)
      return next();
    try {
      await ctx.dbStore.addUserMessage(ctx.message);
    } catch (err) {
      ctx.log.error(err);
    }
    return next();
  });
