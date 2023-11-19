import { InputFile } from "grammy";
import { Composer } from "../composer.js";
import { messageIsReply } from "../guards/index.js";
import { log } from "../logger.js";
import {
  getCodeFromMessage,
  runEnry,
  runTreeSitterHighlight,
} from "../utils/index.js";
import { Readable } from "node:stream";

export default new Composer()
  .on("message")
  .filter(messageIsReply)
  .hears(/^\/codepic(?:@${username})?(?:\s+(\w+))?$/, async (ctx, next) => {
    const reply = ctx.message.reply_to_message;
    const sourceCode = getCodeFromMessage(reply);
    if (!sourceCode) return next();
    const languageName = ctx.match[1] ?? (await runEnry(sourceCode))?.language;
    if (languageName === undefined) return;
    log.info("Highlighting `%s` code", languageName);
    const pictureStream = await runTreeSitterHighlight(
      languageName,
      sourceCode,
    );
    if (pictureStream) {
      const r = new Readable();
      return ctx.replyWithPhoto(new InputFile(pictureStream), {
        reply_to_message_id: reply.message_id,
      });
    }
  });
