import { Bot, BotError, webhookCallback as makeWebhookCallback } from "grammy";
import * as path from "path";
import { IncomingMessage, ServerResponse, createServer } from "http";
import createKnex from "knex";
import IORedis from "ioredis";
import events from "node:events";

import { Context } from "./types/index.js";
import { initLogger, log } from "./logger.js";
import { loadLocales, noop } from "./utils/index.js";
import { getRawMetrics } from "./prometheus.js";
import { BOT_SERVICE_MESSAGES_TIMEOUT } from "./constants.js";
import { AsyncFifo } from "./fifo.js";

import { DbStore } from "./db-store.js";
import { EventQueue } from "./event-queue.js";
import { Message } from "grammy/types";

import * as m from "./middlewares/index.js";
import * as c from "./commands/index.js";

import { composer as promComposer } from "./prometheus.js";

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

  eventQueue
    .on("pong", async ({ api, payload }) => {
      const text = payload.text ?? "Pong";
      await api.sendMessage(payload.chatId, text, {
        reply_to_message_id: payload.messageId,
      });
    })
    .on("captcha_timeout", async ({ api, payload }) => {
      const { chatId, userId, captchaMessageId, newChatMemberMessageId } =
        payload;
      const kicked = await api.banChatMember(chatId, userId);
      const deleted_captcha_message = await api
        .deleteMessage(chatId, captchaMessageId)
        .catch(noop);
      const deleted_new_member_message = await api
        .deleteMessage(chatId, newChatMemberMessageId)
        .catch(noop);
      await eventQueue.pushDelayed(10, "unkick_after_captcha", {
        chat_id: chatId,
        user_id: userId,
      });
      log.info(
        {
          chat: { id: chatId },
          user: { id: userId },
          kicked,
          deleted_captcha_message,
          deleted_new_member_message,
        },
        "Kicked a member due to captcha timeout",
      );
    })
    .on("unkick_after_captcha", async ({ api, payload }) => {
      const unbanned = await api.unbanChatMember(
        payload.chat_id,
        payload.user_id,
      );
      log.info(
        {
          chat: { id: payload.chat_id },
          user: { id: payload.user_id },
          unbanned,
        },
        "Unbanned user after captcha timeout",
      );
    })
    .on("delete_message", async ({ api, payload }) => {
      await api.deleteMessage(payload.chatId, payload.messageId).catch(noop);
    })
    .onError((err) => {
      log.error(err, "Error in Event Queue");
    });

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

  // Extend context
  bot.use((ctx, next) => {
    Object.assign(ctx, {
      dbStore,
      eventQueue,
      botCreatorId,
      deleteItSoon,
      locales,
      t,
      log,
    });
    return next();
  });

  bot.use(promComposer);

  bot.use(m.resolveDbChat);
  bot.use(m.resolveDbUser);
  bot.use(m.trackMemberMessages);
  bot.use(m.substitute);
  bot.use(m.checkCaptchaAnswer);
  bot.use(m.uploadToGistOrHighlight);
  bot.use(m.bash);
  bot.use(m.bangHandler);
  bot.use(m.newChatMember);
  bot.use(m.leftChatMember);
  bot.use(m.removeMessagesUnderCaptcha);

  bot.use(c.chatSettings);
  bot.use(c.report);
  bot.use(c.warn);
  bot.use(c.ping);
  bot.use(c.delMessage);

  const errorHandler = async (err: BotError<Context>) => {
    const { ctx } = err;
    if (ctx.callbackQuery !== undefined) {
      try {
        await ctx.answerCallbackQuery(
          "An error occured while processing your request :(",
        );
      } catch {
        // Noop
      }
    }
    ctx.log.error({
      err: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        cause: err.cause,
      },
      update: ctx.update,
    });
  };

  bot.catch(errorHandler);

  if (process.env.NODE_ENV === "development") {
    await bot.start({ drop_pending_updates: true });
  } else {
    const { WEBHOOK_URL, WEBHOOK_SERVER_PORT } = process.env;
    const webhookCallback = makeWebhookCallback(bot, "http");
    type FifoItem = {
      req: IncomingMessage;
      res: ServerResponse;
    };
    const fifo = new AsyncFifo<FifoItem>();
    const server = createServer(async (req, res) => {
      if (req.url === "/metrics") {
        try {
          const raw = await getRawMetrics();
          res.writeHead(200, { "Content-Type": "text/plain" }).end(raw);
        } catch (err) {
          res
            .writeHead(500, { "Content-Type": "text/plain" })
            .end((err as Error).message);
        }
        return;
      }
      fifo.push({ req, res });
    });
    const consumeUpdates = async () => {
      for await (const { req, res } of fifo) {
        try {
          await webhookCallback(req, res);
        } catch (err) {
          if (err instanceof BotError) {
            const { ctx } = err as BotError<Context>;
            if (ctx.callbackQuery) {
              await ctx
                .answerCallbackQuery("Unexpected error occured")
                .catch(noop);
            }
            const { update } = ctx;
            // @ts-expect-error we don't need this
            delete err.ctx;
            Object.assign(err, { update });
            log.error(err);
          } else {
            log.error(err);
          }
          res.end();
        }
      }
    };
    server.listen({ port: parseInt(WEBHOOK_SERVER_PORT!) });
    await bot.api.setWebhook(WEBHOOK_URL!, { drop_pending_updates: true });
    log.info("Webhook is set");
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    consumeUpdates();

    process.on("SIGINT", () => {
      server.close();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      Promise.allSettled([
        eventQueue.dispose(),
        redisClient.quit().then(() => log.info("Redis disconnected")),
        knex.destroy().then(() => log.info("DB disconnected")),
        events
          .once(server, "close")
          .then(() => log.info("Webhook server closed")),
        bot.api.deleteWebhook().then(
          () => log.info("Webhook deleted"),
          () => log.error("Failed to delete webhook"),
        ),
      ]);
    });
  }
  log.info("Bot started");
}

main().catch(console.error);
