// import { HearsMiddleware } from "../types/index.js";
// import { MIN_CAPTCHA_TIMEOUT, MAX_CAPTCHA_TIMEOUT } from "../constants.js";
// import { Composer } from "../composer.js";
// import { isGroupChat, senderIsAdmin } from "../guards/index.js";
// import { deleteMessage } from "../middlewares.js";

// export const captchaTimeout: HearsMiddleware = Composer.branchAll(
//   [senderIsAdmin, isGroupChat],
//   async function (ctx) {
//     const seconds = parseInt(ctx.match[1]!);
//     const replyOptions = { reply_to_message_id: ctx.message.message_id };
//     if (seconds < MIN_CAPTCHA_TIMEOUT) {
//       await ctx
//         .reply(
//           `Timeout must be at least ${MIN_CAPTCHA_TIMEOUT}s.`,
//           replyOptions,
//         )
//         .then(ctx.deleteItSoon());
//       return;
//     }
//     if (seconds > MAX_CAPTCHA_TIMEOUT) {
//       await ctx
//         .reply(`Timeout can be at most ${MAX_CAPTCHA_TIMEOUT}s.`, replyOptions)
//         .then(ctx.deleteItSoon());
//       return;
//     }
//     await Promise.allSettled([
//       ctx.dbStore.updateChatProp(ctx.chat.id, "captcha_timeout", seconds),
//       ctx.deleteMessage(),
//     ]);
//   } as HearsMiddleware,
//   deleteMessage,
// );
