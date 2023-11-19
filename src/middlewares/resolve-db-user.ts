import { Composer } from "../composer.js";

const composer = new Composer();
export default composer;

composer
  .on("message")
  .chatType(["group", "supergroup"])
  .use(async (ctx, next) => {
    ctx.dbUser = await ctx.dbStore.addUser(ctx.from, ctx.chat.id);
    return next();
  });
