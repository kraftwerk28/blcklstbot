import { senderIsAdmin } from "../guards/index.js";
// import { CommandMiddleware } from "../types/index.js";
// import { Composer } from '../composer'

// export const rules: CommandMiddleware = async function (ctx) {
//   const isAdmin = await senderIsAdmin(ctx);
//   const reply = ctx.message.reply_to_message;
//   const msgText = ctx.message.text;
//   if (msgText.match(/^\/rules(@\w+)?\s+set$/) && isAdmin && reply) {
//     await ctx.dbStore.updateChatProp(
//       ctx.chat.id,
//       "rules_message_id",
//       reply.message_id,
//     );
//     await ctx.deleteMessage();
//   } else if (msgText.match(/^\/rules(@\w+)?\s+del(ete)?$/) && isAdmin) {
//     await ctx.dbStore.updateChatProp(ctx.chat.id, "rules_message_id", null);
//     await ctx.deleteMessage();
//   } else if (typeof ctx.dbChat.rules_message_id === "number") {
//     const replyToId = reply ? reply.message_id : ctx.message.message_id;
//     await ctx.telegram.copyMessage(
//       ctx.chat.id,
//       ctx.chat.id,
//       ctx.dbChat.rules_message_id,
//       { reply_to_message_id: replyToId },
//     );
//     if (reply) {
//       await ctx.deleteMessage();
//     }
//   } else {
//     await ctx.deleteMessage();
//   }
// } as CommandMiddleware;
