import { Composer } from "../composer.js";
import { Chat } from "typegram";
import { code } from "../utils/html.js";

const composer = new Composer();

export default composer;

composer.chatType(["group", "supergroup"]).use(async (ctx, next) => {
  const chat = ctx.chat as Chat.GroupChat & Chat.UserNameChat;
  ctx.dbChat = await ctx.dbStore.addChat({
    id: chat.id,
    title: chat.title,
    username: chat.username,
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
