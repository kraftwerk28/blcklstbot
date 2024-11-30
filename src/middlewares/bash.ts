import cp from "node:child_process";
import util from "node:util";
import { escape, code } from "../utils/html.js";
import { Composer } from "../composer.js";

const exec = util.promisify(cp.exec);

const composer = new Composer();

const FORBIDDEN_ENV = new Set([
  "PG_CONNECTION_STRING",
  "REDIS_HOST",
  "API_TOKEN",
  "API_BASE",
  "BOT_TOKEN",
  "WEBHOOK_SERVER_PORT",
  "WEBHOOK_URL",
  "KRAFTWERK28_UID",
  "REPORTS_CHANNEL_ID",
  "REPORTS_CHANNEL_USERNAME",
  "TREE_SITTER_SERVER_HOST",
  "ENRY_SERVER_HOST",
  "GITHUB_API_HOST",
  "GITHUB_API_KEY",
  "GITHUB_GIST_ID",
  "COMMANDS_CHANNEL_ID",
  "STACKEXCHANGE_API_KEY",
  "SPAMWATCH_TOKEN",
]);

composer.on("message:text").hears(/^!(.+)$/, async (ctx) => {
  if (ctx.from.id !== ctx.botCreatorId) {
    return ctx.react("🗿");
  }
  const env = Object.fromEntries(
    Object.entries(process.env).filter((e) => !FORBIDDEN_ENV.has(e[0])),
  );
  try {
    const { stdout } = await exec(ctx.match[1]!, {
      shell: "/bin/bash",
      // @ts-expect-error type
      env,
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
