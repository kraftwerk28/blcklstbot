// import { Composer } from "../composer.js";
// import { isGroupChat, senderIsAdmin } from "../guards/index.js";
// import { CommandMiddleware } from "../types/index.js";

// export const deleteJoins = Composer.guardAll(
//   [senderIsAdmin, isGroupChat],
//   async function (ctx) {
//     await ctx.deleteMessage();
//     await ctx.dbStore.updateChatProp(
//       ctx.chat.id,
//       "delete_joins",
//       !ctx.dbChat?.delete_joins,
//     );
//   } as CommandMiddleware,
// );
