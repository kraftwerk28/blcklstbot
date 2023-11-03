import { code, escape } from "../utils/html.js";
import { getCodeFromMessage } from "../utils/index.js";
import { Composer } from "../composer.js";

const composer = new Composer();
export default composer;

composer
  .on("message")
  .chatType(["group", "supergroup"])
  .use(async (ctx, next) => {
    if (!ctx.dbChat.replace_code_with_pic || !ctx.message.entities) {
      return next();
    }
    const sourceCode = getCodeFromMessage(ctx.message);
    if (!sourceCode) return next();
    await ctx.reply(code(escape(sourceCode)), { parse_mode: "HTML" });
    return next();
  });
