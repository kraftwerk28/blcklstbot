import cp from "node:child_process";
import util from "node:util";
import { escape, code } from "../utils/html.js";
import { Composer } from "../composer.js";

const exec = util.promisify(cp.exec);

const composer = new Composer();

composer.on("message:text").hears(/^!(.+)$/, async (ctx, next) => {
  if (ctx.from.id !== ctx.botCreatorId) {
    return next();
  }
  const {
    BOT_TOKEN,
    PG_CONNECTION_STRING,
    API_TOKEN,
    WEBHOOK_PATH,
    WEBHOOK_DOMAIN,
    GITHUB_API_KEY,
    GITHUB_GIST_ID,
    ...restEnv
  } = process.env;
  try {
    const { stdout } = await exec(ctx.match[1]!, {
      shell: "/bin/bash",
      // @ts-expect-error type
      env: restEnv,
      timeout: 5000,
    });
    return ctx.reply(code(escape(stdout)), {
      parse_mode: "HTML",
      reply_to_message_id:
        ctx.message.reply_to_message?.message_id ?? ctx.message.message_id,
    });
  } catch {
    // Noop
  }
});

export default composer;
