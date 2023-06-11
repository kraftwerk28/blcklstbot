import { Telegraf } from "telegraf";

import * as m from "./middlewares";
import * as c from "./commands";
import { flushUpdates, isDev, parseCommands } from "./utils";
import { version } from "../package.json";
import { PgClient } from "./pg";
import { RedisClient } from "./redis";
import { Ctx } from "./types";
import { log } from "./logger";
import { Api } from "./blocklist-api";

async function initBot(): Promise<Telegraf<Ctx>> {
  const { BOT_TOKEN, API_TOKEN } = process.env;
  const bot = new Telegraf<Ctx>(BOT_TOKEN!, {
    telegram: { webhookReply: false },
  });
  const botMe = await bot.telegram.getMe();

  bot.context.pg = new PgClient();
  bot.context.redis = new RedisClient();
  bot.context.api = new Api(API_TOKEN!, botMe.id);
  bot.context.banned = new Map();
  bot.context.commands = parseCommands();

  await bot.telegram.setMyCommands(bot.context.commands);

  bot
    // .use(m.noPM)
    .use(m.addChat)
    .on("poll" as any, m.onPoll)
    .on("text", m.onText)
    .on("new_chat_members", m.checkIfBotIsAdmin(false), m.onNewMember)
    .on("left_chat_member", m.checkIfBotIsAdmin(false), m.onLeftMember)
    .command(
      "report",
      m.checkIfBotIsAdmin(true),
      m.validateReportCmd,
      m.adminPermission,
      c.report,
    )
    .command("get_debug_info", m.debugInfo)
    .command(
      "voteban",
      m.checkIfBotIsAdmin(false),
      m.validateReportCmd,
      c.voteban,
    )
    .command("get_user", m.getByUsernameReply)
    .command("stop", m.adminPermission, c.stopVoteban)
    .command("cancel_voteban", c.cancelLastVoteban)
    .hears(
      /\/voteban_threshold(?:[\w@]*)\s*(\d+)?\s*$/,
      m.adminPermission,
      c.setVotebanThreshold,
    )
    .action("unban", m.adminPermissionCBQuery, m.unbanAction)
    .action("deleteMessage", m.adminPermissionCBQuery, m.deleteMessageAction)
    .help(m.adminPermission, c.help)
    .catch((err) => {
      log.error(err);
    });

  ["SIGINT", "SIGTERM"].forEach((signal) => {
    process.once(signal as any, async (code) => {
      log.info(`\nCode: ${code}. Starting graceful shutdown.`);

      await bot.telegram.deleteWebhook().then((didDelete) => {
        log.info("Deleted webhook: %o", didDelete);
      });

      await bot.context.pg?.disconnect();
      bot.stop(signal);

      log.info("Finished graceful shutdown.");
      process.exit(0);
    });
  });

  return bot;
}

async function runBot(bot: Telegraf<Ctx>) {
  const { BOT_HTTP_PORT, BOT_WEBHOOK_HOST, BOT_WEBHOOK_PORT, BOT_SECRET_PATH } =
    process.env;
  log.info(`Starting blcklst bot v${version}.`);
  if (isDev()) {
    await bot.launch();
    log.info("Long polling enabled.");
  } else {
    await bot.launch({
      webhook: {
        domain: `${BOT_WEBHOOK_HOST}:${BOT_WEBHOOK_PORT}`,
        hookPath: BOT_SECRET_PATH,
        port: +BOT_HTTP_PORT!,
      },
    });
    log.info("Webhook enabled.");
  }
}

(async () => {
  try {
    const bot = await initBot();
    await flushUpdates(bot);
    await runBot(bot);
  } catch (err) {
    log.error(err);
  }
})();

process.on("unhandledRejection", (reason) => {
  log.error("UNHANDLED PROMISE REJECTION.");
  log.error(reason);
});
