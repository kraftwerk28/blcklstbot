import { Counter, register } from "prom-client";
import type { Telegraf } from "telegraf";
import type { MessageSubType } from "telegraf/typings/telegram-types";
import type { Ctx } from "./types";

const promMessageCounter = new Counter({
  name: "tg_messages_total",
  help: "Message counter",
  labelNames: ["media_type"],
});

const promUpdateTypes: MessageSubType[] = [
  "text",
  "photo",
  "sticker",
  "photo",
  "video",
];

export function registerPromHandlers(bot: Telegraf<Ctx>) {
  for (const msgSubType of promUpdateTypes) {
    bot.on(msgSubType, (_ctx, next) => {
      promMessageCounter.inc({ media_type: msgSubType });
      return next();
    });
  }
}

export function getRawMetrics() {
  return register.metrics();
}
