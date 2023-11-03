// import { ActionMiddleware } from "../types/index.js";
// import { Composer } from "../composer.js";
// import { senderIsAdmin } from "../guards/index.js";
// import { userMention } from "../utils/html.js";
// import { getDbUserFromReply } from "./get-db-user-from-reply.js";
// import { log } from "../logger.js";
// import { noop, safePromiseAll } from "../utils/index.js";

// const composer = new Composer();
//
// export default composer;

// export const undoBan = Composer.branch(
//   senderIsAdmin,
//   Composer.compose([
//     getDbUserFromReply,
//     async function (ctx) {
//       const chatId = parseInt(ctx.match[1]!);
//       const reportedUserId = parseInt(ctx.match[2]!);
//       const reportedDbUser = await ctx.dbStore.getUser(chatId, reportedUserId);
//       await ctx.unbanChatMember(reportedUserId);
//       const forgiver = ctx.callbackQuery.from;
//       if (ctx.callbackQuery.message) {
//         await ctx
//           .deleteMessage(ctx.callbackQuery.message.message_id)
//           .catch(noop);
//       }
//       log.info(
//         "User %d forgived %d in chat %d",
//         forgiver.id,
//         reportedUserId,
//         chatId,
//       );
//       await ctx.answerCbQuery();
//       const text = ctx.t("forgive", {
//         forgiver: userMention(forgiver),
//         reported: userMention(reportedDbUser),
//       });
//       await safePromiseAll([
//         ctx.replyWithHTML(text),
//         ctx.dbStore.updateUser({
//           chat_id: chatId,
//           id: reportedUserId,
//           warnings_count: 0,
//           banned: false,
//           warn_ban_reason: null,
//         }),
//       ]);
//     } as ActionMiddleware,
//   ]),
//   async function (ctx) {
//     return ctx.answerCbQuery("You don't have permission to pardon user", {
//       show_alert: true,
//     });
//   } as ActionMiddleware,
// );
