import { Composer } from "../composer";
import { ChatLanguageCode, HearsMiddleware } from "../types";
import { senderIsAdmin, isGroupChat } from "../guards";
import { deleteMessage } from "../middlewares";

export const setLanguage = Composer.branchAll(
  [senderIsAdmin, isGroupChat],
  async function (ctx) {
    await ctx.deleteMessage();
    const lang = ctx.match[1] as ChatLanguageCode;
    if (["en", "uk"].includes(lang)) {
      ctx.dbStore.updateChatProp(ctx.chat.id, "language_code", lang);
    }
  } as HearsMiddleware,
  deleteMessage,
);
