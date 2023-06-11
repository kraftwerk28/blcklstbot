import { Composer } from "../composer";
import { Chat } from "typegram";
import { code } from "../utils/html";
import { OnMiddleware } from "../types";
import { isGroupChat } from "../guards";

type Middleware = OnMiddleware<"message">;

export const addChatToDatabase: Middleware = Composer.optional(
  isGroupChat,
  async function (ctx, next) {
    const chat = ctx.chat as Chat.GroupChat & Chat.UserNameChat;
    const dbChat = {
      id: chat.id,
      title: chat.title,
      username: chat.username,
    };
    const inserted = await ctx.dbStore.addChat(dbChat);
    // FIXME: the genericUpsert doesn't work properly at this moment
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (inserted) {
      await ctx.telegram.sendMessage(
        ctx.botCreatorId,
        `New chat: ${chat.title} (${code(chat.id)})`,
      );
    }
    return next();
  },
);
