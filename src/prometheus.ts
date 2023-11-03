import { type FilterQuery, type Bot } from "grammy";
import { Counter, register } from "prom-client";

import type { Context } from "./types/index.js";

const promMessageCounter = new Counter({
  name: "tg_messages_total",
  help: "Message counter",
  labelNames: ["media_type"],
});

const promUpdateTypes: FilterQuery[] = [
  "message:text",
  "message:photo",
  "message:sticker",
  "message:photo",
  "message:video",
];

export function registerPromHandlers(bot: Bot<Context>) {
  for (const msgSubType of promUpdateTypes) {
    bot.on(msgSubType, (_ctx) => {
      promMessageCounter.inc({ media_type: msgSubType });
    });
  }
}

export function getRawMetrics() {
  return register.metrics();
}
