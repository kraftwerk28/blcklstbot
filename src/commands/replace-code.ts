// import { Composer } from "../composer.js";
// import { CommandMiddleware } from "../types/index.js";
// import { botHasSufficientPermissions, isGroupChat } from "../guards/index.js";

// export const replaceCode = Composer.guardAll(
//   [isGroupChat, botHasSufficientPermissions],
//   async function (ctx) {
//     await ctx.deleteMessage();
//     await ctx.dbStore.updateChatProp(
//       ctx.chat.id,
//       "upload_to_gist",
//       !ctx.dbChat.upload_to_gist,
//     );
//   } as CommandMiddleware,
// );
