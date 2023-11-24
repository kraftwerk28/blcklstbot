import { Composer } from "../composer.js";
import { botHasSufficientPermissions } from "../guards/index.js";
import { getCodeFromMessage, runEnry, uploadToGist } from "../utils/index.js";
import { log } from "../logger.js";
import { escape, userMention } from "../utils/html.js";

const GIST_UPLOAD_LINE_COUNT_THRESHOLD = 16;

const composer = new Composer();

export default composer;

/** Detect large code messages and replace them with Gist link */
composer
  .on("message")
  .chatType(["group", "supergroup"])
  .filter(botHasSufficientPermissions)
  .use(async (ctx, next) => {
    if (!ctx.dbChat.upload_to_gist) return next();
    const sourceCode = getCodeFromMessage(ctx.message);
    if (!sourceCode) return next();
    const lineCount = sourceCode.split("\n").length;
    if (lineCount < GIST_UPLOAD_LINE_COUNT_THRESHOLD) return next();
    const enryResult = await runEnry(sourceCode);
    if (!enryResult) return next();
    log.info("Uploading to gist a chunk of `%s` code", enryResult.language);
    const codeUrl = await uploadToGist(enryResult, sourceCode);
    if (!codeUrl) return next();
    await ctx.deleteMessage();
    await ctx.reply(
      ctx.t("upload_to_gist", {
        user: userMention(ctx.from),
        gist_link: escape(codeUrl),
      }),
      {
        reply_to_message_id: ctx.message.reply_to_message?.message_id,
        disable_web_page_preview: true,
        parse_mode: "HTML",
      },
    );
    return next();
  });
