import { Composer } from "../composer.js";

const composer = new Composer();

export default composer;

composer.chatType(["supergroup", "group"]).use(async (ctx, next) => {
  ctx.dbChat = await ctx.dbStore.addChat({
    id: ctx.chat.id,
    title: ctx.chat.title,
    username: "username" in ctx.chat ? ctx.chat.username : undefined,
  });
  return next();
});
