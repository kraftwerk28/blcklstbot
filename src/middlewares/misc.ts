import { Composer } from "grammy";
import { botHasSufficientPermissions } from "../guards/index.js";
import { Context } from "../types/index.js";

const composer = new Composer<Context>();
export default composer;

composer
  .on("message")
  .hears(
    /^\s*(?:[шщ]\s*[оo](?:\s+п\s*[оo])?\s+)?[рp]\s*[уyоo]\s*[сc]\s*н\s*[іiя]\s*\?\s*$/i,
    async (ctx) => {
      const stickers = [
        "CAACAgIAAxkBAAEHZTxjzn3fKGW8EKTmF7HZJpy0aLeoOAACoSMAAgGgeEhLsVmDKNesFi0E",
        "CAACAgIAAxkBAAEHZT5jzn3jYxKCS3X0lbhJ_r531NUS-wAChx4AAi6CeUiC61hfgNIQdS0E",
        "CAACAgIAAxkBAAEHZUBjzn30nYi99Jy-ds1cZY0oQVErlgACiCEAAuQAAeBIbwWqyKE7fxgtBA",
        "CAACAgIAAxkBAAEHZUJjzn38d3l71C8dnrT_njk0qeOQcwACkSAAAkBw4UhCMrX_h7J8cy0E",
        "CAACAgIAAxkBAAEHZURjzn4GmmCCIaa8JYhTAwakHjA9UAACBx8AAue24UhWLkIYzeB6dC0E",
        "CAACAgIAAxkBAAEHZUZjzn4nxSEI1hmrhwFyk5lYC2WfYAACeCQAAjTo4EgYi4nuXYgHQy0E",
        "CAACAgIAAxkBAAEHZUhjzn48V6xzCzvw5lFJ_xjaLbNBpgACDikAAtb4mUlqBe0TO9cFxy0E",
        "CAACAgIAAxkBAAEHZUpjzn5DBBjurBJpEHQOpG8S5Ad79wACRSgAArpmCUqWfsSAvpcVny0E",
        "CAACAgIAAxkBAAEHZUxjzn5aPefPlasU7S0su6TSAyR4BwAC2iIAApKlCEpleuIMv6XNDy0E",
      ];
      const stickerId = stickers[Math.floor(Math.random() * stickers.length)]!;
      return ctx.replyWithSticker(stickerId, {
        reply_to_message_id: ctx.message.message_id,
      });
    },
  );

// Chel
// composer.on("message:text", async (ctx, next) => {
//   if (ctx.chat.id === -1001023368582 && ctx.message.text.match(/ґ/i)) {
//     let doSend = false;
//     if (ctx.from.id === 382744431 && Math.random() > 0.5) {
//       doSend = true;
//     } else if (Math.random() > 0.9) {
//       doSend = true;
//     }
//     if (!doSend) return;
//     return ctx.replyWithSticker(
//       "CAACAgIAAxkBAAEWQyti2a86_6tRiMuDLYmAHTi5H9WYGAACzQ0AAsYHKEjAhjjbs2vN0ikE",
//       { reply_to_message_id: ctx.message.message_id },
//     );
//   } else {
//     return next();
//   }
// });

// Meow
composer
  .on(["message:sticker", "message:animation"])
  .filter((ctx) => ctx.chat.id === -1001134294720 && ctx.from.id === 414490047)
  .use((ctx) => ctx.react("🤡"));

// Meow Clown
composer
  .on(["message"])
  .filter(ctx.from.id === 414490047)
  .use((ctx) => ctx.react("🤡"));
// NN elephant
composer
  .on("message:text")
  .filter(
    (ctx) => ctx.from.id === 764043781 && !!ctx.msg.text.match(/^\s*(🐘\s*)+$/),
  )
  .use((ctx) => ctx.react("🤡"));

// Forward blacklist
const CHANNEL_ID_BLOCKLIST = [
  -1001732054517, // pozdniakov3.0
];
const CHANNEL_USERNAME_BLOCKLIST = [
  "ZOV_Voevoda",
  "novynypravdy",
  "ukhylyant_smsbot",
];
const CHECK_USER_ID = [764043781, 847814684];
composer
  .on("message:forward_origin")
  .filter(botHasSufficientPermissions)
  .filter((ctx) => CHECK_USER_ID.includes(ctx.from.id))
  .filter((ctx) => {
    if (ctx.msg.forward_origin.type !== "channel") return false;
    const { chat } = ctx.msg.forward_origin;
    return (
      CHANNEL_USERNAME_BLOCKLIST.includes(chat.username ?? "") ||
      CHANNEL_ID_BLOCKLIST.includes(chat.id)
    );
  })
  .use((ctx) => ctx.deleteMessage());

// Only
// composer
//   .on("message")
//   .filter(
//     (ctx) => ctx.chat.id === -1002167883618 && ctx.from.id === 5857978484,
//   )
//   .use((ctx) => ctx.react("🤡"));
