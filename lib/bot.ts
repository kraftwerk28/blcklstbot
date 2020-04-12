import { createServer, Server } from 'http';
import { promisify } from 'util';
import Telegraf, { ContextMessageUpdate } from 'telegraf';

import { flushUpdates } from './flushUpdates';
import * as m from './middlewares';
import * as c from './commands';
import * as db from './db';
import * as api from './api';
import { VotebanCooldown } from './votebanCD';
import {} from './commands';
import { Message, Chat, User } from 'telegraf/typings/telegram-types';
import { parseCommands } from './utils';

type Tf = Telegraf<ContextMessageUpdate>;

let dev = false;
let server: Server;
let bot: Tf;

export interface Report {
  chat: Chat;
  reportedUser: User;
  reportedMsg?: Message;
  pollMsg: Message;
  reportMsg: Message;
}

function extendCtx(bot: Tf) {
  const {
    ADMIN_UID,
    REPORTS_CHANNEL_ID,
    REPORTS_CHANNEL_USERNAME,
  } = process.env;

  const { context } = bot;
  context.votebanCD = new VotebanCooldown();
  context.replyTo = async function (text, extra) {
    const { message, chat, telegram } = this;
    if (!(message && chat)) return null;
    return telegram.sendMessage(chat.id, text, {
      ...extra,
      reply_to_message_id: message.message_id,
    });
  };
  context.votebans = new Map();
  context.banned = new Map();
  context.cbQueryError = function (
    text = 'An error occured',
    showAlert = false
  ) {
    return this.answerCbQuery(text, showAlert);
  };
  context.deleteMessageWeak = function (chatId, messageId) {
    return this.telegram.deleteMessage(chatId, messageId).catch(() => false);
  };
  context.db = db;
  context.api = api;
  context.adminUID = +ADMIN_UID!;
  context.reportsChannelID = +REPORTS_CHANNEL_ID!;
  context.reportsChannelUsername = REPORTS_CHANNEL_USERNAME!;
  context.commands = parseCommands();
}

async function initBot() {
  const { NODE_ENV, BOT_TOKEN, BOT_USERNAME, API_TOKEN } = process.env;
  dev = NODE_ENV === 'development';
  api.setAPIToken(API_TOKEN!);
  bot = new Telegraf(BOT_TOKEN!, {
    username: BOT_USERNAME,
    telegram: { webhookReply: false },
  });
  extendCtx(bot);

  await bot.telegram.setMyCommands(bot.context.commands);

  bot
    .use(m.noPM)
    .use(m.addChat)
    .on('poll' as any, m.onPoll)
    .on('text', m.onText)
    .on('new_chat_members', m.checkBotAdminWeak, m.onNewMember)
    .on('left_chat_member', m.checkBotAdminWeak, m.onLeftMember)
    .command(
      'report',
      m.safeBanReport,
      m.checkBotAdmin,
      m.adminPermission,
      c.report
    )
    .command('get_debug_info', m.debugInfo)
    .command('voteban', m.safeBanReport, m.checkBotAdmin, c.voteban)
    .command('get_user', m.getByUsernameReply)
    .command('stop', m.adminPermission, c.stopVoteban)
    .command('cancel_voteban', c.cancelLastVoteban)
    .hears(
      /\/voteban_threshold(?:[\w@]*)\s*(\d+)?\s*$/,
      m.adminPermission,
      c.setVotebanThreshold
    )
    .action('unban', m.adminPermissionCBQuery, m.unbanAction)
    .action('deleteMessage', m.adminPermissionCBQuery, m.deleteMessageAction)
    .help(m.adminPermission, c.help);
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
  await initBot();
  await flushUpdates(bot);
  db.connect();
  return runBot();
}

main();

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal as any, async (code) => {
    console.log(`\nCode: ${code}. Starting graceful shutdown.`);
    // await bot.stop();
    if (!dev) {
      await bot.telegram.deleteWebhook();
      await promisify(server.close.bind(server))();
    }
    await db.disconnect();
    console.log('Finished graceful shutdown.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED PROMISE REJECTION.');
  console.error(reason);
});
