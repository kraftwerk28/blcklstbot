import { Telegraf } from 'telegraf';
import { Ctx, OnMiddleware } from '';

const bot = new Telegraf(process.env.BOT_TOKEN!);

const onTextHandler: OnMiddleware<Ctx, 'text'> = async function(ctx) {
  if (ctx.message) {
  }
};

bot.on('text', onTextHandler);

