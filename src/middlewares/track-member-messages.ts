import { Composer } from "../composer.js";

const composer = new Composer();

export default composer;

composer
  .on("message")
  .chatType(["group", "supergroup"])
  .use(async (ctx, next) => {
    ctx.log.debug("Persisting user message");
    try {
      await ctx.dbStore.addUserMessage(ctx.msg, ctx.from);
    } catch (err) {
      ctx.log.error(err);
    }
    return next();
  });
