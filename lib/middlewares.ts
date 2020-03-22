import { replicas as REPLICAS } from '../bot.config.json';
import * as api from './api';
import * as db from './db';
import {
  Middleware,
  ContextMessageUpdate,
  Extra,
  Markup,
  Context
} from 'telegraf';
import { User, Message, Chat } from 'telegraf/typings/telegram-types';
import * as utils from './utils';

type CtxMW = Middleware<ContextMessageUpdate>;

type PollType = 'quiz' | 'regular';
type PollOption = { text: string; voter_count: number };

interface PollExtra {
  is_anonymous: boolean;
  type: PollType;
  allows_multiple_answers: boolean;
  correct_option_id: number;
  is_closed: boolean;
  disable_notification: boolean;
  reply_to_message_id: number;
  reply_markup: Markup;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  total_voter_count: number;
  is_closed: boolean;
  is_anonymous: boolean;
  type: PollType;
  allows_multiple_answers: boolean;
}

interface PollAnswer {
  poll_id: string;
  user: User;
  option_ids: number[];
}

declare module 'telegraf' {
  export interface Telegram {
    sendPoll(
      chatId: number,
      question: string,
      options: string[],
      extra?: Partial<PollExtra>
    ): Promise<Message>;
  }
  export interface ContextMessageUpdate {
    poll?: Poll;
    pollAnswer?: PollAnswer;
  }
}

export interface Report {
  chat: Chat;
  reportedMsg: Message;
  pollMsg: Message;
  votebanMsg: Message;
}

const { ADMIN_UID } = process.env;
const votebans = new Map<string, Report>();

export const noPM: CtxMW = function(ctx: ContextMessageUpdate, next) {
  const { chat, reply } = ctx;
  if (!chat) return;
  const { type } = chat;

  if (!['group', 'supergroup'].includes(type)) {
    reply(REPLICAS.private_messsages_restriction);
  } else {
    return next!();
  }
};

export const report: CtxMW = async function(ctx) {
  const { message, telegram: tg, chat, from, reply } = ctx;
  if (!(from && chat && message)) return;
  const admins = await tg.getChatAdministrators(chat.id);
  const reportedMsg = message.reply_to_message;
  const dbGroup = await db.getChat(chat);
  const me = await tg.getMe();

  // check if command is replying
  if (!reportedMsg) return;

  // if someone reported myself or admin
  if (
    reportedMsg.from!.id === me.id ||
    admins.some(({ user: { id } }) => id === reportedMsg.from!.id)
  ) {
    // reply(REPLICAS.self_report, {
    //   reply_to_message_id: message.message_id
    // });
    return;
  }

  // check if reporter is admin
  if (admins.findIndex(u => u.user.id === from.id) === -1) {
    // reply(REPLICAS.you_are_not_admin, {
    //   reply_to_message_id: message.message_id
    // });
    return;
  }

  // check if I can ban and delete
  const meChatMember = admins.find(cm => cm.user.id === me.id);
  const perms =
    meChatMember &&
    meChatMember.can_restrict_members &&
    meChatMember.can_delete_messages;
  if (!(meChatMember && perms)) {
    reply(REPLICAS.i_am_not_admin, {
      reply_to_message_id: message!.message_id
    });
    return;
  }

  await utils.kickUser(ctx, reportedMsg, message, dbGroup && dbGroup.legal);

  await utils.runAll(
    // reported message
    tg.deleteMessage(chat.id, reportedMsg.message_id),
    // report command by admin
    tg.deleteMessage(chat.id, message.message_id)
  );
};

export const onNewMember: CtxMW = async function(ctx) {
  const { message, telegram: tg, reply, chat } = ctx;
  if (!(message && chat)) return;
  const me = await tg.getMe();
  const newMembers = message.new_chat_members;
  if (!newMembers?.length) return;

  // if someone added ME
  // send chat info to my PM
  if (newMembers.find(m => m.id === me.id)) {
    await reply(REPLICAS.group_welcome);
    const addedInDB = await db.addChat(chat);
    const newGroupMsg =
      '<b>New group</b>\n\n' +
      `chat id: <code>${chat.id}</code>\n\n` +
      `<code>${JSON.stringify(message, null, 2)}</code>`;
    if (addedInDB) {
      await tg.sendMessage(ADMIN_UID!, newGroupMsg, { parse_mode: 'HTML' });
    }
  }

  // if someone joined
  const dbGroup = await db.getChat(chat);
  if (dbGroup && dbGroup.legal) {
    /** @type {Array<number>} */
    const blackList = await api.getBlacklist().then(res => res.map(m => m.id));
    const toBeBanned = newMembers.filter(memb =>
      blackList.some(id => id === memb.id)
    );
    if (!(await utils.iAmAdmin(ctx))) {
      reply(REPLICAS.i_am_not_admin);
      return;
    }
    toBeBanned.forEach(({ id }) => {
      tg.kickChatMember(chat.id, id);
      // reply(REPLICAS.user_banned.replace(
      //   /\$1/, username ? `@${username}` : first_name
      // ))
    });
  }
};

export const onLeftMember: CtxMW = async function(ctx) {
  const {
    message,
    from,
    telegram: { getMe, deleteMessage }
  } = ctx;
};

export const onPoll: CtxMW = async function(ctx) {
  const { poll, telegram: tg } = ctx;
  if (!poll) return;
  const voteban = votebans.get(ctx.poll!.id);
  // no votebans in memory
  if (!voteban) return;

  const { chat, pollMsg, reportedMsg, votebanMsg } = voteban;
  const { voteban_threshold } = await db.getChat(chat);

  const [votedYes, votedNo] = poll.options.map(o => o.voter_count);

  if (votedYes >= voteban_threshold) {
    votebans.delete(poll.id);

    await utils.runAll(
      tg.deleteMessage(chat.id, pollMsg.message_id),
      tg.deleteMessage(chat.id, reportedMsg.message_id),
      tg.deleteMessage(chat.id, votebanMsg.message_id),
      utils.kickUser(ctx, reportedMsg, votebanMsg)
    );
  } else if (votedNo >= voteban_threshold) {
    await utils.runAll(
      tg.deleteMessage(chat.id, pollMsg.message_id),
      tg.deleteMessage(chat.id, votebanMsg.message_id)
    );
  }
};

export const onText: CtxMW = async function(ctx) {
  const { chat, from } = ctx;
  if (!chat) return;
  await db.addChat(chat);
  await utils.checkUser(ctx);
};

/* unimplemented! */
export const unban: CtxMW = function(ctx) {};

export const help: CtxMW = async function({ reply, message }) {
  const { message_id } = message!;
  reply(REPLICAS.rules, { reply_to_message_id: message_id });
};

export const debugInfo: CtxMW = async function({ message, reply }) {
  return reply(`<code>${JSON.stringify(message, null, 2)}</code>`, {
    parse_mode: 'HTML',
    reply_to_message_id: message!.message_id
  });
};

export const getByUsernameReply: CtxMW = async function({
  message,
  chat,
  telegram,
  reply
}) {
  const uId = message?.reply_to_message?.from?.id!;
  const user = await telegram.getChatMember(chat!.id, uId);
  return reply(`<code>${JSON.stringify(user.user, null, 2)}</code>`, {
    parse_mode: 'HTML'
  });
};

export const voteban: CtxMW = async function(ctx) {
  const { chat, message, from } = ctx;
  if (!(chat && message && from)) return;
  if (!message.reply_to_message) return;

  const reportedMsg = message.reply_to_message;
  const pollMsg = await ctx.telegram.sendPoll(
    chat!.id,
    `Ban ${utils.mention(reportedMsg.from!)} (reported by ${utils.mention(
      from
    )})?`,
    ['Yes.', 'No.']
  );

  const pollId = (pollMsg as any).poll.id;
  const vb: Report = {
    chat,
    pollMsg,
    reportedMsg,
    votebanMsg: message
  };
  votebans.set(pollId, vb);
};
