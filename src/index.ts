import { Telegraf } from "telegraf";
import util from "util";
import * as path from "path";
import * as crypto from "crypto";
import { createServer } from "http";

import { Ctx } from "./types";
import { extendBotContext } from "./extend-context";
import { initLogger, log } from "./logger";
import { noop, regexp } from "./utils";
import * as middlewares from "./middlewares";
import * as commands from "./commands";
import { registerPromHandlers, getRawMetrics } from "./prometheus";

async function main() {
  if (process.env.NODE_ENV === "development") {
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.resolve(".env.dev") });
  }
  initLogger();
  const bot = new Telegraf<Ctx>(process.env.BOT_TOKEN!);

  async function shutdownHandler(signal: NodeJS.Signals) {
    log.info(`Handling ${signal}...`);
    try {
      await bot.context.dbStore?.shutdown();
      bot.context.eventQueue?.dispose();
      process.exit(0);
    } catch (err) {
      log.error(err);
      process.exit(1);
    }
  }
  process.on("SIGTERM", shutdownHandler);
  process.on("SIGINT", shutdownHandler);

  bot.telegram.webhookReply = false;
  await extendBotContext(bot);
  const botInfo = await bot.telegram.getMe();
  bot.botInfo ??= botInfo;
  const username = botInfo.username;

  registerPromHandlers(bot);

  bot
    .use(middlewares.getDbChat)
    .on("message", middlewares.addUserToDatabase)
    .on("message", middlewares.trackMemberMessages)
    .on("text", middlewares.substitute)
    .on("text", middlewares.highlightCode)
    .on("text", middlewares.checkCaptchaAnswer)
    .on("text", middlewares.uploadToGistOrHighlight)
    .on(["chat_member", "new_chat_members"], middlewares.onNewChatMember)
    .on("left_chat_member", middlewares.leftChatMember)
    .hears(regexp`^\/ping(?:@${username})?\s+(\d+)(?:\s+(.+))?$`, commands.ping)
    .hears(regexp`^\/codepic(?:@${username})?(?:\s+(\w+))?$`, commands.codePic)
    .hears(
      regexp`^\/captcha(?:@${username})?((?:\s+[\w-]+)+)?\s*$`,
      commands.captcha,
    )
    .hears(
      regexp`^\/captcha_timeout(?:@${username})?\s+(\d+)$`,
      commands.captchaTimeout,
    )
    .hears(regexp`^\/report(?:@${username})?(?:\s+(.+))?$`, commands.report)
    .hears(regexp`^\/warn(?:@${username})?(?:\s+(.+))?$`, commands.warn)
    .hears(
      regexp`^\/language(?:@${username})?\s+(\w{2})$`,
      commands.setLanguage,
    )
    .hears(
      regexp`^\/(un)?def(global)?(?:@${username})?\s+(\w+)$`,
      commands.defMessage,
    )
    .hears(regexp`^!when\s+(.*)$`, async (ctx, next) => {
      if (!ctx.match[1]) {
        return next();
      }
      const sentence = ctx.match[1].trim();
      const segmenter = new Intl.Segmenter(ctx.dbChat.language_code, {
        granularity: "word",
      });
      const segments = Array.from(segmenter.segment(sentence));
      const words = segments.filter((seg) => seg.isWordLike);
      const wordRatio = words.length / segments.length;
      if (wordRatio < 0.42) {
        return;
      }
      log.debug(
        { words: JSON.stringify(words), wordRatio },
        "!when bang command",
      );

      const hash = crypto.createHash("sha256");
      const hashBuf = hash.update(ctx.match[1].trim()).digest();

      let timestamp = 0;
      for (let i = 0; i < 8; i++) {
        timestamp ^= hashBuf.readUInt32LE(i * 4);
      }
      timestamp = Math.abs(timestamp) % (365 * 3 * 24 * 60 * 60);

      const when = new Date(Date.now() + timestamp * 1000);
      const datePart = when.toLocaleString(ctx.dbChat.language_code, {
        dateStyle: "long",
        timeZone: "Europe/Kiev",
      });
      const weekDayPart = when.toLocaleString(ctx.dbChat.language_code, {
        weekday: "short",
        timeZone: "Europe/Kiev",
      });
      const answerText = ctx.t("predicc", {
        fact: sentence,
        weekday: weekDayPart,
        date: datePart,
      });
      await ctx.reply(answerText, {
        reply_to_message_id: ctx.message.message_id,
      });
    })
    .hears(regexp`^!(\w+)$`, commands.bangHandler)
    .command("rules", commands.rules)
    .command("settings", commands.groupSettings)
    .command("help", commands.help)
    .command("del", commands.delMessage)
    .command("delete_joins", commands.deleteJoins)
    .command("replace_code", commands.replaceCode)
    .command("banlist", commands.banList)
    .command("gist", commands.manualGist)
    .action(/^unban:([\d-]+):([\d-]+)$/, middlewares.undoBan)
    .hears(
      /^\s*[шщ]\s*[оo](?:\s+п\s*[оo])?\s+[рp]\s*[уyоo]\s*[сc]\s*н\s*[іiя]\s*\?\s*$/i,
      async (ctx) => {
        const stickers = [
          "CAACAgIAAxkBAAEbIHZjn4JyuHfzG9_pohwU0VVeBdmaVQACkSAAAkBw4UhCMrX_h7J8cywE",
          "CAACAgIAAxkBAAEbIHhjn4J7TqjL2-jW1ghd5-84PsSFlAACiCEAAuQAAeBIbwWqyKE7fxgsBA",
          "CAACAgIAAxkBAAEbIHxjn4J_N2nD5amyWKu7VtCLzO1eeAACeCQAAjTo4EgYi4nuXYgHQywE",
          "CAACAgIAAxkBAAEbmeRjswrEf4t_uGxR9DGnMFw7sa0augACDikAAtb4mUlqBe0TO9cFxy0E",
        ];
        const stickerId = stickers[Math.floor(Math.random() * stickers.length)];
        return ctx.replyWithSticker(stickerId, {
          reply_to_message_id: ctx.message.message_id,
        });
      },
    )
    .on("text", async (ctx, next) => {
      if (ctx.chat.id === -1001023368582 && ctx.message.text.match(/ґ/i)) {
        let doSend = false;
        if (ctx.from.id === 382744431 && Math.random() > 0.5) {
          doSend = true;
        } else if (Math.random() > 0.9) {
          doSend = true;
        }
        if (!doSend) return;
        return ctx.replyWithSticker(
          "CAACAgIAAxkBAAEWQyti2a86_6tRiMuDLYmAHTi5H9WYGAACzQ0AAsYHKEjAhjjbs2vN0ikE",
          { reply_to_message_id: ctx.message.message_id },
        );
      } else {
        return next();
      }
    })
    .catch((err, ctx) => {
      log.error(
        "Error in `bot::catch`\nUpdate: %s\nError: %O",
        util.inspect(ctx.update, { colors: true, depth: null }),
        err,
      );
    });

  bot.context
    .eventQueue!.on("pong", async ({ telegram, payload }) => {
      const text = payload.text ?? "Pong";
      await telegram.sendMessage(payload.chatId, text, {
        reply_to_message_id: payload.messageId,
      });
    })
    .on("captcha_timeout", async ({ telegram, payload }) => {
      const { chatId, userId, captchaMessageId, newChatMemberMessageId } =
        payload;
      await telegram.kickChatMember(chatId, userId);
      await telegram.unbanChatMember(chatId, userId);
      await telegram.deleteMessage(chatId, captchaMessageId).catch(noop);
      await telegram.deleteMessage(chatId, newChatMemberMessageId).catch(noop);
    })
    .on("delete_message", async ({ telegram, payload }) => {
      await telegram
        .deleteMessage(payload.chatId, payload.messageId)
        .catch(noop);
    });

  await bot.telegram.setMyCommands(commands.publicCommands);

  switch (process.env.NODE_ENV) {
    case "development":
      log.info("Launching in polling mode");
      await bot.launch({ dropPendingUpdates: true });
      break;
    case "production": {
      log.info("Launching in webhook mode");
      const { WEBHOOK_DOMAIN, WEBHOOK_PORT, SERVER_PORT, BOT_TOKEN } =
        process.env;
      const webhookCallback = bot.webhookCallback(`/${BOT_TOKEN}`);
      await bot.telegram.setWebhook(
        `https://${WEBHOOK_DOMAIN}:${WEBHOOK_PORT}/blcklstbot/${BOT_TOKEN}`,
        { drop_pending_updates: true },
      );
      const server = createServer(async (req, res) => {
        if (req.url === "/metrics") {
          try {
            const raw = await getRawMetrics();
            return res
              .writeHead(200, { "Content-Type": "text/plain" })
              .end(raw);
          } catch (err) {
            return res.writeHead(500).end((err as Error).message);
          }
        }
        return webhookCallback(req, res);
      });
      server.listen(SERVER_PORT);

      // await bot.launch({
      //   dropPendingUpdates: true,
      //   webhook: {
      //     hookPath: WEBHOOK_PATH,
      //     domain: `${WEBHOOK_DOMAIN}:${WEBHOOK_PORT}`,
      //     port: parseInt(SERVER_PORT!),
      //   },
      // });
      break;
    }
    default:
      log.error("NODE_ENV must be defined");
      process.exit(1);
  }
}

main().catch((err) => {
  log.error(err, "Error in `::main`");
});
