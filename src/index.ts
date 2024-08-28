import { Bot, BotError, webhookCallback as makeWebhookCallback } from "grammy";
import * as path from "path";
import { IncomingMessage, ServerResponse, createServer } from "http";
import createKnex from "knex";
import IORedis from "ioredis";
import events from "node:events";
import pg from "pg";

import { Context, EventQueueEvent, TranslateFn } from "./types/index.js";
import { initLogger, log } from "./logger.js";
import { loadLocales, noop } from "./utils/index.js";
import { getRawMetrics } from "./prometheus.js";
import { BOT_SERVICE_MESSAGES_TIMEOUT } from "./constants.js";
import { AsyncFifo } from "./fifo.js";

import { DbStore } from "./db-store.js";
import { EventQueue } from "./event-queue.js";
import { Message, Update } from "grammy/types";

import * as m from "./middlewares/index.js";
import * as c from "./commands/index.js";

import { composer as promComposer } from "./prometheus.js";
import { userMention, escape } from "./utils/html.js";

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

  // NOTE: INT8 is same as uint64_t
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
      const { chatId, userId, captchaMessageId } = payload;
      await api.banChatMember(chatId, userId);
      const deleted_captcha_message = await api
        .deleteMessage(chatId, captchaMessageId)
        .catch(noop);
      await eventQueue.pushDelayed(10, "unkick_after_captcha", {
        chat_id: chatId,
        user_id: userId,
      });
      log.info(
        {
          chat: { id: chatId },
          user: { id: userId },
          deleted_captcha_message,
        },
        "Kicked user due to captcha timeout",
      );
    })
    .on("unkick_after_captcha", async ({ api, payload }) => {
      const { chat_id, user_id } = payload;
      await api.unbanChatMember(chat_id, user_id);
      log.info(
        { chat: { id: chat_id }, user: { id: user_id } },
        "Unbanned user due to captcha kick cooldown",
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

  const t: TranslateFn = function (this: Context, s, replaces = {}) {
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

  const banUser: Context["banUser"] = async function (
    reported,
    reporter,
    reason,
  ) {
    // const callbackData = `unban:${ctx.chat.id}:${reportedUser.id}`;
    // const inlineKbd = new InlineKeyboard().text("\u{1f519} Undo", callbackData);
    let banAnnounceText: string;
    if (reporter) {
      banAnnounceText = this.t("report_with_reporter", {
        reporter: userMention(reporter),
        reported: userMention(reported),
      });
    } else {
      banAnnounceText = this.t("report", {
        reported: userMention(reported),
      });
    }
    if (reason) {
      banAnnounceText +=
        "\n" + this.t("report_reason", { reason: escape(reason) });
    }

    const allUserMessageIds = await this.dbStore.getUserMessages(
      this.chat.id,
      reported.id,
    );
    this.log.info({ messages: allUserMessageIds }, "Reported user messages");
    // TODO: will this fail if count of message is too large?
    const results = await Promise.allSettled(
      allUserMessageIds.map(({ message_id }) =>
        this.api.deleteMessage(this.chat.id, message_id),
      ),
    );
    const deletedCount = results.reduce(
      (total, result) => (total + result.status === "fulfilled" ? 1 : 0),
      0,
    );
    log.info(
      {
        count: deletedCount,
        total: allUserMessageIds.length,
      },
      "Deleted user messages",
    );

    if (this.dbChat.propagate_bans) {
      await this.dbStore.updateUser({
        id: reported.id,
        banned: true,
        warn_ban_reason: reason,
        banned_timestamp: new Date(),
      });
    } else {
      await this.dbStore.updateUser({
        chat_id: this.chat.id,
        id: reported.id,
        banned: true,
        warn_ban_reason: reason,
        banned_timestamp: new Date(),
      });
    }

    try {
      await this.deleteMessage().catch(noop);
      await this.banChatMember(reported.id),
        await this.reply(banAnnounceText, { parse_mode: "HTML" });
    } catch (err) {
      this.log.error(err);
    }
  };

  const getChatMemberCached: Context["getChatMemberCached"] = async function (
    userId,
  ) {
    if (!(userId in this._chatMemberCache)) {
      this._chatMemberCache[userId] = await this.getChatMember(userId);
    }
    return this._chatMemberCache[userId]!;
  };

  // Extend context
  bot.use((ctx, next) => {
    const { message, from, chat } = ctx;
    const childObj: Record<string, any> = {};
    if (chat) {
      childObj.chat = {
        id: chat.id,
        title:
          (chat.type === "group" || chat.type === "supergroup") && chat.title,
      };
    }
    if (from) {
      childObj.from = {
        id: from.id,
        first_name: from.first_name,
        username: from.username,
      };
    }
    if (message) {
      childObj.message = {
        id: message.message_id,
        thread_id: message.message_thread_id,
      };
    }
    const childLog = log.child(childObj);
    Object.assign(ctx, {
      dbStore,
      eventQueue,
      botCreatorId,
      deleteItSoon,
      locales,
      t,
      log: childLog,
      banUser,
      _chatMemberCache: {},
      getChatMemberCached,
    });
    return next();
  });

  bot.use(promComposer);

  // NOTE: the order is important
  bot.use(m.resolveDbChat);
  bot.use(m.resolveDbUser);
  bot.use(m.trackMemberMessages);

  bot.use(m.casBan);
  bot.use(m.newChatMember);
  bot.use(m.leftChatMember);
  bot.use(m.removeMessagesUnderCaptcha);

  bot.use(m.uploadToGistOrHighlight);

  bot.use(m.substitute);
  bot.use(m.checkCaptchaAnswer);
  bot.use(m.bangHandler);
  bot.use(m.bash);
  bot.use(m.muter);
  bot.use(m.slots);
  bot.use(m.misc);

  const isPromoUrl = (raw: string) => {
    try {
      const u = new URL(raw);
      const paramKeys = Array.from(u.searchParams.keys());
      const BANNED_KEYS = ["promo", "ref", "claim"];
      return (
        u.host.endsWith(".xyz") &&
        paramKeys.some((k) => BANNED_KEYS.includes(k))
      );
    } catch {
      return false;
    }
  };
  bot
    .on("msg:entities")
    .filter((ctx) =>
      ctx.msg.entities.some(
        (e) =>
          (e.type === "text_link" && isPromoUrl(e.url)) ||
          (e.type === "url" &&
            isPromoUrl(ctx.msg.text.slice(e.offset, e.offset + e.length))),
      ),
    )
    .use((ctx) => ctx.deleteMessage());

  bot.use(c.chatSettings);
  bot.use(c.report);
  bot.use(c.banList);
  bot.use(c.warn);
  bot.use(c.ping);
  bot.use(c.delMessage);
  bot.use(c.defCommand);

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

  // await bot.api.setMyCommands([
  //   { command: "settings", description: "Change chat settings" },
  //   {
  //     command: "report",
  //     description: "Mention target user or reply to their message to report",
  //   },
  //   {
  //     command: "warn",
  //     description: "Mention target user or reply to their message to warn",
  //   },
  //   {
  //     command: "ping",
  //     description: "/ping XhYmZs <message> to remind yourself!",
  //   },
  // ]);

  const allowedUpdates: ReadonlyArray<Exclude<keyof Update, "update_id">> = [
    "message",
    "edited_message",
    // "channel_post",
    // "edited_channel_post",
    // "business_connection",
    // "business_message",
    // "edited_business_message",
    // "deleted_business_messages",
    // "message_reaction",
    // "message_reaction_count",
    "inline_query",
    "chosen_inline_result",
    "callback_query",
    // "shipping_query",
    // "pre_checkout_query",
    // "poll",
    // "poll_answer",
    "my_chat_member",
    "chat_member",
    // "chat_join_request",
    // "chat_boost",
    // "removed_chat_boost",
  ];

  if (process.env.NODE_ENV === "development") {
    // NOTE: in grammY, Bot::catch won't work with webhooks, it only makes sense with polling
    bot.catch(errorHandler);
    log.info("Starting in long polling mode");
    await bot.start({
      drop_pending_updates: true,
      allowed_updates: allowedUpdates,
      onStart() {
        log.info("Bot started");
      },
    });
  } else {
    log.info("Starting in webhook mode");
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
    await bot.api.setWebhook(WEBHOOK_URL!, {
      drop_pending_updates: true,
      allowed_updates: allowedUpdates,
    });
    log.info("Webhook is set");
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    consumeUpdates();
    log.info("Bot started");

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
}

main().catch(console.error);
