import { type FilterQuery } from "grammy";
import { Counter, register } from "prom-client";

import { Composer } from "./composer.js";

const promMessageCounter = new Counter({
  name: "tg_messages_total",
  help: "Message counter",
  labelNames: ["media_type"],
});

export function getRawMetrics() {
  return register.metrics();
}

export const composer = new Composer();

const promUpdateTypes: FilterQuery[] = [
  "message:text",
  "message:photo",
  "message:sticker",
  "message:photo",
  "message:video",
];

for (const msgSubType of promUpdateTypes) {
  composer.on(msgSubType, (_ctx, next) => {
    const media_type = msgSubType.slice("message:".length);
    promMessageCounter.inc({ media_type });
    return next();
  });
}
