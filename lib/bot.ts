import { createServer, Server } from 'http';
import { promisify } from 'util';
import Telegraf, { ContextMessageUpdate } from 'telegraf';

import eat from './updateEater';
import * as m from './middlewares';
import * as db from './db';
import * as api from './api';
import { VotebanCooldown } from './votebanCD';
import {
  Message,
  ExtraReplyMessage,
  Chat,
  User
} from 'telegraf/typings/telegram-types';

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
// typing for context extending feature
declare module 'telegraf' {
  export interface ComposerConstructor {
    admin<TContext extends ContextMessageUpdate>(
      ...middlewares: Middleware<TContext>[]
    ): Middleware<TContext>;
  }
  export interface ContextMessageUpdate {
    votebanCD: VotebanCooldown;
    replyTo(
      text: string,
      extra?: ExtraReplyMessage | undefined
    ): Promise<Message | null>;
    votebans: Map<string, Report>;
    banned: Map<
      number,
      { chatId: number; userId: number; resultMsgId: number }
    >;
    cbQueryError(): Promise<boolean>;
    deleteMessageWeak(
      chatId: number | string,
      messageId: number
    ): Promise<boolean>;
  }
}

function initBot() {
  const { NODE_ENV, BOT_TOKEN, BOT_USERNAME, API_TOKEN } = process.env;
  dev = NODE_ENV === 'development';
  api.setAPIToken(API_TOKEN!);
  bot = new Telegraf(BOT_TOKEN!, {
    username: BOT_USERNAME,
    telegram: { webhookReply: false }
  });

  bot.context.votebanCD = new VotebanCooldown();
  bot.context.replyTo = async function(text, extra) {
    const { message, chat, telegram } = this;
    if (!(message && chat)) return null;
    return telegram.sendMessage(chat.id, text, {
      ...extra,
      reply_to_message_id: message.message_id
    });
  };
  bot.context.votebans = new Map();
  bot.context.banned = new Map();
  bot.context.cbQueryError = function(
    text = 'An error occured',
    showAlert = false
  ) {
    return this.answerCbQuery(text, showAlert);
  };
  bot.context.deleteMessageWeak = function(chatId, messageId) {
    return this.telegram.deleteMessage(chatId, messageId).catch(() => false);
  }

  bot
    .on('poll' as any, m.onPoll)
    .use(m.noPM)
    .on('text', m.onText)
    .on('new_chat_members', m.checkBotAdminWeak, m.onNewMember)
    .on('left_chat_member', m.checkBotAdminWeak, m.onLeftMember)
    .command(
      'report',
      m.safeBanReport,
      m.checkBotAdmin,
      m.adminPermission,
      m.report
    )
    .command('get_debug_info', m.debugInfo)
    .command('voteban', m.safeBanReport, m.checkBotAdmin, m.voteban)
    .command('get_user', m.getByUsernameReply)
    .command('stop', m.adminPermission, m.stopVoteban)
    .command('cancel_voteban', m.cancelLastVoteban)
    .command('register', m.register)
    .hears(
      /\/voteban_threshold(?:[\w@]*)\s*(\d+)?\s*$/,
      m.adminPermission,
      m.setVotebanThreshold
    )
    .action('unban', m.adminPermissionCBQuery, m.unbanAction)
    .action('deleteMessage', m.adminPermissionCBQuery, m.deleteMessageAction)
    .help(m.adminPermission, m.help);
}

async function runBot() {
  const {
    BOT_HTTP_PORT,
    BOT_WEBHOOK_PORT,
    BOT_SECRET_PATH,
    BOT_URL
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
  process.on(signal as any, async code => {
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

process.on('unhandledRejection', reason => {
  console.error('UNHANDLED PROMISE REJECTION.');
  console.error(reason);
});
