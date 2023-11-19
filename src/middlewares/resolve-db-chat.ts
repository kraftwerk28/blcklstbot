import { Composer } from "../composer.js";
import { Chat } from "typegram";
import { code } from "../utils/html.js";

const composer = new Composer();

export default composer;

composer.chatType(["supergroup", "group"]).use(async (ctx, next) => {
  ctx.dbChat = await ctx.dbStore.addChat({
    id: ctx.chat.id,
    title: ctx.chat.title,
    username: ctx.chat.username,
  });
  // FIXME: the genericUpsert doesn't work properly at this moment
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  // if (dbChat) {
  //   await ctx.api.sendMessage(
  //     ctx.botCreatorId,
  //     `New chat: ${chat.title} (${code(chat.id)})`,
  //   );
  // }
  return next();
});
