import { Composer } from "../composer.js";
import { CommandMiddleware } from "../types/index.js";
import { senderIsAdmin, isGroupChat } from "../guards/index.js";
// import { deleteMessage } from "../middlewares.js";

// export const propagateReports = Composer.branchAll(
//   [senderIsAdmin, isGroupChat],
//   async function (ctx) {
//     await ctx.dbStore.updateChatProp(
//       ctx.chat.id,
//       "propagate_bans",
//       !ctx.dbChat.propagate_bans,
//     );
//   } as CommandMiddleware,
//   deleteMessage,
// );
