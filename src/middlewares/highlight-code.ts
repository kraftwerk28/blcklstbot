import { OnMiddleware } from "../types";
import { code, escape } from "../utils/html";
import { getCodeFromMessage } from "../utils";
import { Composer } from "../composer";
import { isGroupChat } from "../guards";

export const highlightCode: OnMiddleware<"text"> = Composer.optional(
  isGroupChat,
  async function (ctx, next) {
    if (!ctx.dbChat.replace_code_with_pic || !ctx.message.entities) {
      return next();
    }
    const sourceCode = getCodeFromMessage(ctx.message);
    if (!sourceCode) return next();
    await ctx.replyWithHTML(code(escape(sourceCode)));
    return next();
  } as OnMiddleware<"text">,
);
