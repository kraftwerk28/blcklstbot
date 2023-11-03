import { Bot } from "grammy";
import util from "util";
import * as path from "path";
import * as crypto from "crypto";
import { createServer } from "http";
import createKnex from "knex";
import IORedis from "ioredis";

import { Context } from "./types/index.js";
// import { extendBotContext } from "./extend-context.js";
import { initLogger, log } from "./logger.js";
import { loadLocales, noop, regexp } from "./utils/index.js";
// import * as middlewares from "./middlewares.js";
// import * as commands from "./commands.js";
import { getRawMetrics } from "./prometheus.js";
import { BOT_SERVICE_MESSAGES_TIMEOUT } from "./constants.js";

import bangHandler from "./commands/bang-handler.js";
import bash from "./commands/bash.js";
import chatSettings from "./commands/chat-settings.js";
import { DbStore } from "./db-store.js";
import { EventQueue } from "./event-queue.js";
import { Message } from "grammy/types";

import addChatToDatabase from "./middlewares/add-chat-to-database.js";
import addUserToDatabase from "./middlewares/add-chat-to-database.js";

async function main() {
  if (process.env.NODE_ENV === "development") {
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.resolve(".env.dev") });
  }

  initLogger();

  const bot = new Bot<Context>(process.env.BOT_TOKEN);

  log.info("Connecting to Redis...");
  const redisClient = new IORedis({
    host: process.env.REDIS_HOST,
    retryStrategy: (times) => (times < 5 ? 1 : null),
  });
  log.info("Connecting to Postgres...");
  const knex = createKnex({
    client: "pg",
    connection: {
      connectionString: process.env.PG_CONNECTION_STRING,
    },
  });
  log.info("Current DB migration: %s", await knex.migrate.currentVersion());
  await knex.migrate.latest();
  log.info("Latest DB migration: %s", await knex.migrate.currentVersion());
  const dbStore = new DbStore(knex, redisClient);
  const eventQueue = new EventQueue(bot.api, dbStore);
  const botCreatorId = parseInt(process.env.KRAFTWERK28_UID);

  function deleteItSoon(this: Context) {
    return async (msg: Message) => {
      if (!this.chat) {
        return msg;
      }
      await this.eventQueue?.pushDelayed(
        BOT_SERVICE_MESSAGES_TIMEOUT,
        "delete_message",
        {
          chatId: this.chat.id,
          messageId: msg.message_id,
        },
      );
      return msg;
    };
  }
  const locales = await loadLocales();
  const t: Context["t"] = function (this: Context, s, replaces = {}) {
    this.dbChat;
    const locale = this.locales[this.dbChat.language_code ?? "en"];
    let value = locale[s];
    if (!value) {
      // Fallback to en locale
      value = this.locales!.en[s];
    }
    if (!value) return s;
    return value.replace(/(?<!{){(\w+)}(?!})/g, (match, key) => {
      if (key in replaces) {
        return replaces[key]!.toString();
      } else {
        return match;
      }
    });
  };

  bot.use((ctx, next) => {
    ctx.dbStore = dbStore;
    ctx.eventQueue = eventQueue;
    ctx.botCreatorId = botCreatorId;
    ctx.deleteItSoon = deleteItSoon;
    ctx.locales = locales;
    ctx.t = t;
    ctx.log = log;
    return next();
  });

  bot.use(addChatToDatabase);
  bot.use(addUserToDatabase);

  bot.use(bash);
  bot.use(bangHandler);
  bot.use(chatSettings);

  await bot.start();
  log.info("Bot started");
}

main().catch(console.error);

// async function main() {
//   if (process.env.NODE_ENV === "development") {
//     const dotenv = await import("dotenv");
//     dotenv.config({ path: path.resolve(".env.dev") });
//   }
//   initLogger();
//
//   const bot = new Bot<Context>(process.env.BOT_TOKEN);
//
//   bot.use(bangHandler);
//   bot.use(banlist);
//   bot.use(bash);
//   bot.use(chatSettings);
//
//   // const bot = new Telegraf<Ctx>(process.env.BOT_TOKEN!);
//
//   // async function shutdownHandler(signal: NodeJS.Signals) {
//   //   log.info(`Handling ${signal}...`);
//   //   try {
//   //     await bot.context.dbStore?.shutdown();
//   //     bot.context.eventQueue?.dispose();
//   //     process.exit(0);
//   //   } catch (err) {
//   //     log.error(err);
//   //     process.exit(1);
//   //   }
//   // }
//   // process.on("SIGTERM", shutdownHandler);
//   // process.on("SIGINT", shutdownHandler);
//
//   // bot.telegram.webhookReply = false;
//   // await extendBotContext(bot);
//   // const botInfo = await bot.telegram.getMe();
//   // bot.botInfo ??= botInfo;
//   // const username = botInfo.username;
//
//   // registerPromHandlers(bot);
//
//   // bot
//   //   .use(middlewares.getDbChat)
//   //   .on("message", middlewares.addUserToDatabase)
//   //   .on("message", middlewares.trackMemberMessages)
//   //   .on("text", middlewares.substitute)
//   //   .on("text", middlewares.highlightCode)
//   //   .on("text", middlewares.checkCaptchaAnswer)
//   //   .on("text", middlewares.uploadToGistOrHighlight)
//   //   .on(["chat_member", "new_chat_members"], middlewares.onNewChatMember)
//   //   .on("left_chat_member", middlewares.leftChatMember)
//   //   .hears(regexp`^\/ping(?:@${username})?\s+(\d+)(?:\s+(.+))?$`, commands.ping)
//   //   .hears(regexp`^\/codepic(?:@${username})?(?:\s+(\w+))?$`, commands.codePic)
//   //   .hears(
//   //     regexp`^\/captcha(?:@${username})?((?:\s+[\w-]+)+)?\s*$`,
//   //     commands.captcha,
//   //   )
//   //   .hears(
//   //     regexp`^\/captcha_timeout(?:@${username})?\s+(\d+)$`,
//   //     commands.captchaTimeout,
//   //   )
//   //   .hears(regexp`^\/report(?:@${username})?(?:\s+(.+))?$`, commands.report)
//   //   .hears(regexp`^\/warn(?:@${username})?(?:\s+(.+))?$`, commands.warn)
//   //   .hears(
//   //     regexp`^\/language(?:@${username})?\s+(\w{2})$`,
//   //     commands.setLanguage,
//   //   )
//   //   .hears(
//   //     regexp`^\/(un)?def(global|local)(?:@${username})?\s+(\S+)$`,
//   //     commands.defMessage,
//   //   )
//   //   .hears(regexp`^!when\s+(.*)$`, async (ctx, next) => {
//   //     if (!ctx.match[1]) {
//   //       return next();
//   //     }
//   //     const sentence = ctx.match[1].trim();
//   //     const segmenter = new Intl.Segmenter(ctx.dbChat.language_code, {
//   //       granularity: "word",
//   //     });
//   //     const segments = Array.from(segmenter.segment(sentence));
//   //     const words = segments.filter((seg) => seg.isWordLike);
//   //     const wordRatio = words.length / segments.length;
//   //     if (wordRatio < 0.42) {
//   //       return;
//   //     }
//   //     log.debug(
//   //       { words: JSON.stringify(words), wordRatio },
//   //       "!when bang command",
//   //     );
//
//   //   const hash = crypto.createHash("sha256");
//   //   const hashBuf = hash.update(ctx.match[1].trim()).digest();
//   //
//   //   let timestamp = 0;
//   //   for (let i = 0; i < 8; i++) {
//   //     timestamp ^= hashBuf.readUInt32LE(i * 4);
//   //   }
//   //   timestamp = Math.abs(timestamp) % (365 * 3 * 24 * 60 * 60);
//   //
//   //   const when = new Date(Date.now() + timestamp * 1000);
//   //   const datePart = when.toLocaleString(ctx.dbChat.language_code, {
//   //     dateStyle: "long",
//   //     timeZone: "Europe/Kiev",
//   //   });
//   //   const weekDayPart = when.toLocaleString(ctx.dbChat.language_code, {
//   //     weekday: "short",
//   //     timeZone: "Europe/Kiev",
//   //   });
//   //   const answerText = ctx.t("predicc", {
//   //     fact: sentence,
//   //     weekday: weekDayPart,
//   //     date: datePart,
//   //   });
//   //   await ctx.reply(answerText, {
//   //     reply_to_message_id: ctx.message.message_id,
//   //   });
//   // })
//   // .hears(regexp`^!(\w+)$`, commands.bangHandler)
//   // .hears(regexp`^!(.+)$`, commands.runBash)
//   // .command("rules", commands.rules)
//   // .command("settings", commands.groupSettings)
//   // .command("help", commands.help)
//   // .command("del", commands.delMessage)
//   // .command("delete_joins", commands.deleteJoins)
//   // .command("replace_code", commands.replaceCode)
//   // .command("banlist", commands.banList)
//   // .command("gist", commands.manualGist)
//   // .action(/^unban:([\d-]+):([\d-]+)$/, middlewares.undoBan)
//   // .hears(
//   //   /^\s*(?:[шщ]\s*[оo](?:\s+п\s*[оo])?\s+)?[рp]\s*[уyоo]\s*[сc]\s*н\s*[іiя]\s*\?\s*$/i,
//   //   async (ctx) => {
//   //     const stickers = [
//   //       "CAACAgIAAxkBAAEHZTxjzn3fKGW8EKTmF7HZJpy0aLeoOAACoSMAAgGgeEhLsVmDKNesFi0E",
//   //       "CAACAgIAAxkBAAEHZT5jzn3jYxKCS3X0lbhJ_r531NUS-wAChx4AAi6CeUiC61hfgNIQdS0E",
//   //       "CAACAgIAAxkBAAEHZUBjzn30nYi99Jy-ds1cZY0oQVErlgACiCEAAuQAAeBIbwWqyKE7fxgtBA",
//   //       "CAACAgIAAxkBAAEHZUJjzn38d3l71C8dnrT_njk0qeOQcwACkSAAAkBw4UhCMrX_h7J8cy0E",
//   //       "CAACAgIAAxkBAAEHZURjzn4GmmCCIaa8JYhTAwakHjA9UAACBx8AAue24UhWLkIYzeB6dC0E",
//   //       "CAACAgIAAxkBAAEHZUZjzn4nxSEI1hmrhwFyk5lYC2WfYAACeCQAAjTo4EgYi4nuXYgHQy0E",
//   //       "CAACAgIAAxkBAAEHZUhjzn48V6xzCzvw5lFJ_xjaLbNBpgACDikAAtb4mUlqBe0TO9cFxy0E",
//   //       "CAACAgIAAxkBAAEHZUpjzn5DBBjurBJpEHQOpG8S5Ad79wACRSgAArpmCUqWfsSAvpcVny0E",
//   //       "CAACAgIAAxkBAAEHZUxjzn5aPefPlasU7S0su6TSAyR4BwAC2iIAApKlCEpleuIMv6XNDy0E",
//   //     ];
//   //     const stickerId =
//   //       stickers[Math.floor(Math.random() * stickers.length)]!;
//   //     return ctx.replyWithSticker(stickerId, {
//   //       reply_to_message_id: ctx.message.message_id,
//   //     });
//   //   },
//   // )
//   // .on("text", async (ctx, next) => {
//   //   if (ctx.chat.id === -1001023368582 && ctx.message.text.match(/ґ/i)) {
//   //     let doSend = false;
//   //     if (ctx.from.id === 382744431 && Math.random() > 0.5) {
//   //       doSend = true;
//   //     } else if (Math.random() > 0.9) {
//   //       doSend = true;
//   //     }
//   //     if (!doSend) return;
//   //     return ctx.replyWithSticker(
//   //       "CAACAgIAAxkBAAEWQyti2a86_6tRiMuDLYmAHTi5H9WYGAACzQ0AAsYHKEjAhjjbs2vN0ikE",
//   //       { reply_to_message_id: ctx.message.message_id },
//   //     );
//   //   } else {
//   //     return next();
//   //   }
//   // })
//   // .catch((err, ctx) => {
//   //   log.error(
//   //     "Error in `bot::catch`\nUpdate: %s\nError: %O",
//   //     util.inspect(ctx.update, { colors: true, depth: null }),
//   //     err,
//   //   );
//   // });
//
//   bot.context
//     .eventQueue!.on("pong", async ({ telegram, payload }) => {
//       const text = payload.text ?? "Pong";
//       await telegram.sendMessage(payload.chatId, text, {
//         reply_to_message_id: payload.messageId,
//       });
//     })
//     .on("captcha_timeout", async ({ telegram, payload }) => {
//       const { chatId, userId, captchaMessageId, newChatMemberMessageId } =
//         payload;
//       const kicked = await telegram.kickChatMember(chatId, userId);
//       const deleted_captcha_message = await telegram
//         .deleteMessage(chatId, captchaMessageId)
//         .catch(noop);
//       const deleted_new_member_message = await telegram
//         .deleteMessage(chatId, newChatMemberMessageId)
//         .catch(noop);
//       await bot.context.eventQueue?.pushDelayed(10, "unkick_after_captcha", {
//         chat_id: chatId,
//         user_id: userId,
//       });
//       log.info(
//         {
//           chat: { id: chatId },
//           user: { id: userId },
//           kicked,
//           deleted_captcha_message,
//           deleted_new_member_message,
//         },
//         "Kicked a member due to captcha timeout",
//       );
//     })
//     .on("unkick_after_captcha", async ({ telegram, payload }) => {
//       const unbanned = await telegram.unbanChatMember(
//         payload.chat_id,
//         payload.user_id,
//       );
//       log.info(
//         {
//           chat: { id: payload.chat_id },
//           user: { id: payload.user_id },
//           unbanned,
//         },
//         "Unbanned user after captcha timeout",
//       );
//     })
//     .on("delete_message", async ({ telegram, payload }) => {
//       await telegram
//         .deleteMessage(payload.chatId, payload.messageId)
//         .catch(noop);
//     })
//     .onError((err) => {
//       log.error(err, "Error in Event Queue");
//     });
//
//   await bot.telegram.setMyCommands(commands.publicCommands);
//
//   switch (process.env.NODE_ENV) {
//     case "development":
//       log.info("Launching in polling mode");
//       await bot.launch({ dropPendingUpdates: true });
//       break;
//     case "production": {
//       log.info("Launching in webhook mode");
//       const { WEBHOOK_DOMAIN, WEBHOOK_PORT, SERVER_PORT, BOT_TOKEN } =
//         process.env;
//       const webhookCallback = bot.webhookCallback(`/${BOT_TOKEN}`);
//       await bot.telegram.setWebhook(
//         `https://${WEBHOOK_DOMAIN}:${WEBHOOK_PORT}/blcklstbot/${BOT_TOKEN}`,
//         { drop_pending_updates: true },
//       );
//       const server = createServer(async (req, res) => {
//         if (req.url === "/metrics") {
//           try {
//             const raw = await getRawMetrics();
//             return res
//               .writeHead(200, { "Content-Type": "text/plain" })
//               .end(raw);
//           } catch (err) {
//             return res.writeHead(500).end((err as Error).message);
//           }
//         }
//         return webhookCallback(req, res);
//       });
//       server.listen(SERVER_PORT);
//
//       // await bot.launch({
//       //   dropPendingUpdates: true,
//       //   webhook: {
//       //     hookPath: WEBHOOK_PATH,
//       //     domain: `${WEBHOOK_DOMAIN}:${WEBHOOK_PORT}`,
//       //     port: parseInt(SERVER_PORT!),
//       //   },
//       // });
//       break;
//     }
//     default:
//       log.error("NODE_ENV must be defined");
//       process.exit(1);
//   }
// }
//
// main().catch((err) => {
//   log.error(err, "Error in `::main`");
// });
