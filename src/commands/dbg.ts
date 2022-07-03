import { CommandMiddleware } from "../types";
import { html } from "../utils";

export const dbg: CommandMiddleware = async function (ctx) {
  const { message } = ctx;
  let text;
  if (message.reply_to_message) {
    text = JSON.stringify(message.reply_to_message, null, 2);
  } else {
    text = JSON.stringify(message, null, 2);
  }
  ctx.replyWithHTML(html.code(html.escape(text)), {
    reply_to_message_id: ctx.message.message_id,
  });
};
