import { Telegraf } from "telegraf";
import { Ctx, OnMiddleware } from "../src/types";

const bot = new Telegraf<Ctx>(process.env.BOT_TOKEN!);

const onTextHandler: OnMiddleware<"text"> = async function (ctx) {
  if (ctx.message) {
  }
};

bot.on("text", onTextHandler);
