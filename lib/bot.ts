import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { promisify } from 'util';

import Telegraf, { Extra, Markup, ContextMessageUpdate } from 'telegraf';
import * as api from './api';
import eat from './updateEater';
import * as middlewares from './middlewares';
import * as db from './db';

type Tf = Telegraf<ContextMessageUpdate>;

let dev = false;
let server: Server;
let bot: Tf;

function initBot() {
  const {
    NODE_ENV,
    BOT_TOKEN,
    BOT_USERNAME,
    API_TOKEN,
  } = process.env;
  dev = NODE_ENV === 'development';
  api.setAPIToken(API_TOKEN!);
  bot = new Telegraf(BOT_TOKEN!, {
    username: BOT_USERNAME,
    telegram: { webhookReply: false }
  });

  bot
    .on('text', middlewares.onText)
    .on('poll' as any, middlewares.onPoll)
    .on('new_chat_members', middlewares.onNewMember)
    .on('left_chat_member', middlewares.onLeftMember)
    .use(middlewares.noPM)
    .command('report', middlewares.report)
    .command('unban', middlewares.unban)
    .command('det_debug_info', middlewares.debugInfo)
    .command('voteban', middlewares.voteban)
    .command('get_user', middlewares.getByUsernameReply)
    .help(middlewares.help);
  // .command('board', ctx => {
  //   ctx.reply('...', {
  //     reply_markup: Markup.inlineKeyboard(
  //       Array(8)
  //         .fill(null)
  //         .map((_, i) =>
  //           Array(8)
  //             .fill(null)
  //             .map((_, j) =>
  //               Markup.callbackButton((i * 8 + j).toString(), 'Hello')
  //             )
  //         )
  //     )
  //   });
  // })
  // .on('callback_query', ctx => {
  //   const { callbackQuery } = ctx;
  //   console.log(callbackQuery);
  //   return ctx.answerCbQuery('Ok!');
  // })
  // .on('inline_query', ctx => {
  //   const { inlineQuery } = ctx;
  //   console.log(inlineQuery);
  //   return ctx.answerInlineQuery([
  //     {
  //       type: 'article',
  //       id: '0',
  //       input_message_content: { message_text: 'Lol' },
  //       title: inlineQuery!.query
  //     },
  //     {
  //       type: 'article',
  //       id: '0',
  //       input_message_content: { message_text: 'Kek' },
  //       title: ':' + inlineQuery!.query + ':'
  //     }
  //   ]);
  // });
}

async function runBot() {
  const {
    BOT_HTTP_PORT,
    BOT_WEBHOOK_PORT,
    BOT_SECRET_PATH,
    BOT_URL,
  } = process.env;
  if (dev) {
    bot.startPolling();
    console.log('Started development bot.');
  } else {
    const WEBHOOK_URL = `${BOT_URL}:${BOT_WEBHOOK_PORT}${BOT_SECRET_PATH}`;
    const whSetResult = await bot.telegram.setWebhook(WEBHOOK_URL);
    if (whSetResult) {
      console.log(`Webhook set succsessfully on :${BOT_WEBHOOK_PORT}.`);
    } else {
      console.error('Failed to set webhook. Exiting.');
      process.exit(1);
    }

    server = createServer((req, res) => {
      bot.webhookCallback(BOT_SECRET_PATH!)(req, res);
    });
    server.listen(BOT_HTTP_PORT, () => {
      console.log(`Server listening on :${BOT_HTTP_PORT}.`);
    });
  }
}

async function main() {
  initBot();
  await eat(bot);
  db.connect();
  runBot();
}

main();

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal as any, async () => {
    console.log('Starting graceful shutdown.');
    await bot.stop();
    if (!dev) {
      await bot.telegram.deleteWebhook();
      await promisify(server.close.bind(server))();
    }
    await db.disconnect();
    console.log('Finished graceful shutdown.');
    process.exit(0);
  });
});
