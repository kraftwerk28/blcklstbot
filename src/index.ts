import { Bot, BotError, webhookCallback as makeWebhookCallback } from "grammy";
import * as path from "path";
import { IncomingMessage, ServerResponse, createServer } from "http";
import createKnex from "knex";
import IORedis from "ioredis";
import events from "node:events";
import pg from "pg";

import { Context, EventQueueEvent } from "./types/index.js";
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

const { types: pgTypes } = pg;

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

  // NOTE: Using parseInt for BIGINT's here is presumably safe
  pgTypes.setTypeParser(pgTypes.builtins.INT8, parseInt);

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
  const eventQueue = new EventQueue<EventQueueEvent>(bot.api, dbStore);
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
    .on("unmute", async ({ api, payload }) => {
      const { saved_permissions } = await dbStore.getUser(
        payload.chat_id,
        payload.user_id,
      );
      await api.restrictChatMember(payload.chat_id, payload.user_id, {
        ...saved_permissions,
        can_send_messages: true,
      });
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
    if (!this.dbChat) return s;
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

  // NOTE: the order is important
  bot.use(m.resolveDbChat);
  bot.use(m.resolveDbUser);
  bot.use(m.trackMemberMessages);

  bot.use(m.newChatMember);
  bot.use(m.leftChatMember);
  bot.use(m.removeMessagesUnderCaptcha);

  bot.use(m.uploadToGistOrHighlight);

  bot.use(m.substitute);
  bot.use(m.checkCaptchaAnswer);
  bot.use(m.bangHandler);
  bot.use(m.bash);

  bot.use(m.muter);

  bot
    .on("message")
    .hears(
      /^\s*(?:[шщ]\s*[оo](?:\s+п\s*[оo])?\s+)?[рp]\s*[уyоo]\s*[сc]\s*н\s*[іiя]\s*\?\s*$/i,
      async (ctx) => {
        const stickers = [
          "CAACAgIAAxkBAAEHZTxjzn3fKGW8EKTmF7HZJpy0aLeoOAACoSMAAgGgeEhLsVmDKNesFi0E",
          "CAACAgIAAxkBAAEHZT5jzn3jYxKCS3X0lbhJ_r531NUS-wAChx4AAi6CeUiC61hfgNIQdS0E",
          "CAACAgIAAxkBAAEHZUBjzn30nYi99Jy-ds1cZY0oQVErlgACiCEAAuQAAeBIbwWqyKE7fxgtBA",
          "CAACAgIAAxkBAAEHZUJjzn38d3l71C8dnrT_njk0qeOQcwACkSAAAkBw4UhCMrX_h7J8cy0E",
          "CAACAgIAAxkBAAEHZURjzn4GmmCCIaa8JYhTAwakHjA9UAACBx8AAue24UhWLkIYzeB6dC0E",
          "CAACAgIAAxkBAAEHZUZjzn4nxSEI1hmrhwFyk5lYC2WfYAACeCQAAjTo4EgYi4nuXYgHQy0E",
          "CAACAgIAAxkBAAEHZUhjzn48V6xzCzvw5lFJ_xjaLbNBpgACDikAAtb4mUlqBe0TO9cFxy0E",
          "CAACAgIAAxkBAAEHZUpjzn5DBBjurBJpEHQOpG8S5Ad79wACRSgAArpmCUqWfsSAvpcVny0E",
          "CAACAgIAAxkBAAEHZUxjzn5aPefPlasU7S0su6TSAyR4BwAC2iIAApKlCEpleuIMv6XNDy0E",
        ];
        const stickerId =
          stickers[Math.floor(Math.random() * stickers.length)]!;
        return ctx.replyWithSticker(stickerId, {
          reply_to_message_id: ctx.message.message_id,
        });
      },
    );

  bot.on("message:text", async (ctx, next) => {
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
  });

  bot.use(c.chatSettings);
  bot.use(c.report);
  bot.use(c.warn);
  bot.use(c.ping);
  bot.use(c.delMessage);

  const errorHandler = async (err: unknown) => {
    if (err instanceof BotError) {
      const { ctx } = err as BotError<Context>;
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery("Unexpected error occured").catch(noop);
      }
      const { update } = ctx;
      // @ts-expect-error we don't need this
      delete err.ctx;
      Object.assign(err, { update });
      log.error(err);
    } else {
      log.error(err);
    }
  };

  await bot.api.setMyCommands([
    { command: "settings", description: "Change chat settings" },
    {
      command: "report",
      description: "Mention target user or reply to their message to report",
    },
    {
      command: "warn",
      description: "Mention target user or reply to their message to warn",
    },
    {
      command: "ping",
      description: "/ping XhYmZs <message> to remind yourself!",
    },
  ]);

  if (process.env.NODE_ENV === "development") {
    // NOTE: in grammY, Bot::catch won't work with webhooks, it only makes sense with polling
    bot.catch(errorHandler);
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
          await errorHandler(err);
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
