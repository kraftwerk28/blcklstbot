import { log } from "../logger";
import { HearsMiddleware } from "../types";
import { getCodeFromMessage, runEnry, runTreeSitterHighlight } from "../utils";

export const codePic: HearsMiddleware = async function (ctx, next) {
  const reply = ctx.message.reply_to_message;
  if (!reply || !("text" in reply)) return next();

  const sourceCode = getCodeFromMessage(reply);
  if (!sourceCode) return next();
  const languageName = ctx.match[1] ?? (await runEnry(sourceCode))?.language;
  if (!languageName) return;
  log.info("Highlighting `%s` code", languageName);
  const pictureStream = await runTreeSitterHighlight(languageName, sourceCode);
  if (pictureStream) {
    return ctx.replyWithPhoto(
      { source: pictureStream, filename: "pic.png" },
      { reply_to_message_id: reply.message_id },
    );
  }
};
