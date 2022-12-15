import { Composer } from "../composer";
import { isGroupChat, senderIsAdmin } from "../guards";
import { CommandMiddleware } from "../types";

export const deleteJoins = Composer.guardAll(
  [senderIsAdmin, isGroupChat],
  async function (ctx) {
    await ctx.deleteMessage();
    await ctx.dbStore.updateChatProp(
      ctx.chat.id,
      "delete_joins",
      !ctx.dbChat?.delete_joins,
    );
  } as CommandMiddleware,
);
