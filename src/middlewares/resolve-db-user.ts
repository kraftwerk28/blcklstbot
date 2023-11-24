import { Composer } from "../composer.js";

const composer = new Composer();

export default composer;

composer.chatType(["group", "supergroup"]).use(async (ctx, next) => {
  const from = ctx.from;
  if (from) {
    ctx.dbUser = await ctx.dbStore.addUser(from, ctx.chat.id);
  }
  return next();
});
