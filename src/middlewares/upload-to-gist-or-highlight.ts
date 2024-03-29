import { Composer } from "../composer";
import { OnMiddleware } from "../types";
import { botHasSufficientPermissions, isGroupChat } from "../guards";
import { getCodeFromMessage, runEnry, uploadToGist } from "../utils";
import { log } from "../logger";
import { escape, userMention } from "../utils/html";

const GIST_UPLOAD_LINE_COUNT_THRESHOLD = 16;

/** Detect large code messages and replace them with Gist link */
export const uploadToGistOrHighlight = Composer.guardAll(
  [isGroupChat, botHasSufficientPermissions],
  async function (ctx, next) {
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
    await ctx.replyWithHTML(
      ctx.t("upload_to_gist", {
        user: userMention(ctx.from),
        gist_link: escape(codeUrl),
      }),
      {
        reply_to_message_id: ctx.message.reply_to_message?.message_id,
        disable_web_page_preview: true,
      },
    );
    return next();
  } as OnMiddleware<"text">,
);
