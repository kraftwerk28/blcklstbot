// import { Composer } from "../composer.js";
// import { ChatLanguageCode, HearsMiddleware } from "../types/index.js";
// import { senderIsAdmin, isGroupChat } from "../guards/index.js";
// import { deleteMessage } from "../middlewares.js";
//
// export const setLanguage = Composer.branchAll(
//   [senderIsAdmin, isGroupChat],
//   async function (ctx) {
//     await ctx.deleteMessage();
//     const lang = ctx.match[1] as ChatLanguageCode;
//     if (["en", "uk"].includes(lang)) {
//       await ctx.dbStore.updateChatProp(ctx.chat.id, "language_code", lang);
//     }
//   } as HearsMiddleware,
//   deleteMessage,
// );
