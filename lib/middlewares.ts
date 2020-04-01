import { Middleware, ContextMessageUpdate } from 'telegraf';
import { User, Message } from 'telegraf/typings/telegram-types';
import * as api from './api';
import * as db from './db';
import * as utils from './utils';
import { replicas as REPLICAS } from '../bot.config.json';
import { Report } from './bot';
import { helpText } from './helpText';

type CtxMW = Middleware<ContextMessageUpdate>;

declare module 'telegraf' {
  export interface Telegram {
    sendPoll(
      chatId: number,
      question: string,
      options: string[],
      extra?: Partial<PollExtra>
    ): Promise<Message>;
    unbanChatMember(chatId: number, userId: number): Promise<boolean>;
  }

  type PollType = 'quiz' | 'regular';
  type PollOption = { text: string; voter_count: number };

  export interface ContextMessageUpdate {
    poll?: Poll;
    pollAnswer?: PollAnswer;
  }
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
}

const { ADMIN_UID } = process.env;

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
  const reportedUser = reportedMsg?.from;
  const dbGroup = await db.getChat(chat);
  const me = await tg.getMe();

  // check if command is replying
  if (!reportedMsg || !reportedUser) return;

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

  await utils.kickUser(
    ctx,
    chat,
    reportedUser,
    message,
    reportedMsg,
    dbGroup && dbGroup.voteban_to_global
  );

  await utils.runAll(
    ctx.deleteMessageWeak(chat.id, reportedMsg.message_id),
    ctx.deleteMessageWeak(chat.id, message.message_id)
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
  if (dbGroup && dbGroup.voteban_to_global) {
    const blackList = await api.getBlacklist().then(res => res.map(m => m.id));
    const toBeBanned = newMembers.filter(memb =>
      blackList.some(id => id === memb.id)
    );
    if (toBeBanned.length && !(await utils.iAmAdmin(ctx))) {
      reply(REPLICAS.i_am_not_admin);
      return;
    }
    if (toBeBanned.length) {
      await ctx.deleteMessageWeak(chat.id, message.message_id);
    }
    toBeBanned.forEach(async ({ id }) => {
      await tg.kickChatMember(chat.id, id);
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
  const { poll, telegram: tg, votebans } = ctx;
  if (!poll) return;
  const voteban = votebans.get(ctx.poll!.id);
  // no votebans in memory
  if (!voteban) return;

  const { chat, pollMsg, reportedMsg, reportMsg, reportedUser } = voteban;
  const { voteban_threshold, voteban_to_global } = await db.getChat(chat);

  const [votedYes, votedNo] = poll.options.map(o => o.voter_count);

  const diff = votedYes - votedNo;
  if (diff >= voteban_threshold) {
    votebans.delete(poll.id);

    await utils.runAll(
      ctx.deleteMessageWeak(chat.id, pollMsg.message_id),
      reportedMsg && ctx.deleteMessageWeak(chat.id, reportedMsg.message_id),
      ctx.deleteMessageWeak(chat.id, reportMsg.message_id),
      utils.kickUser(
        ctx,
        chat,
        reportedUser,
        reportMsg,
        reportedMsg,
        voteban_to_global
      )
    );
  } else if (-diff >= voteban_threshold) {
    await utils.runAll(
      ctx.deleteMessageWeak(chat.id, pollMsg.message_id),
      ctx.deleteMessageWeak(chat.id, reportMsg.message_id)
    );
  }
};

export const onText: CtxMW = async function(ctx, next) {
  const { chat } = ctx;
  if (!chat) return;
  await db.addChat(chat);
  await utils.checkUser(ctx);
  return next!();
};

/* unimplemented! */
export const unban: CtxMW = function(ctx) {};

export const help: CtxMW = async function(ctx) {
  return ctx.replyTo(helpText());
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
  const { chat, message, from, telegram, votebans } = ctx;
  if (!(chat && message && from)) return;
  if (!message.reply_to_message) return;

  // check voteban cooldown
  if (ctx.votebanCD.has(chat.id)) return;

  const reportedUser = utils.getReportedUser(ctx);
  if (!reportedUser) return;

  if (Array.from(votebans).find(v => v[1].reportedUser.id === reportedUser.id))
    return;

  const pollMsg = await telegram.sendPoll(
    chat!.id,
    `Ban ${utils.mention(reportedUser)}` +
      ` (reported by ${utils.mention(from)})?`,
    ['Yes.', 'No.']
  );

  const pollId = (pollMsg as any).poll.id;
  const vb: Report = {
    chat,
    reportedUser,
    reportMsg: message,
    pollMsg,
    reportedMsg: message.reply_to_message
  };
  votebans.set(pollId, vb);
};

export const stopVoteban: CtxMW = async function(ctx, next) {
  const isAdminMsg = await utils.checkAdmin(ctx);
  if (!isAdminMsg) return next!();

  ctx.votebanCD.cd(ctx.chat!.id);
};

export const unbanAction: CtxMW = async function(ctx, next) {
  const { banned, callbackQuery: { message } = {} } = ctx;
  if (!message) return ctx.cbQueryError();

  const toUnban = banned.get(message!.message_id);
  if (!toUnban) return ctx.cbQueryError();

  await utils.runAll(
    ctx.telegram.unbanChatMember(toUnban.chatId, toUnban.userId),
    ctx.deleteMessageWeak(toUnban.chatId, toUnban.resultMsgId),
    api.rmUser(toUnban.userId)
  );
  banned.delete(message.message_id);
  return ctx.answerCbQuery('✅ Unbanned.');
};

export const deleteMessageAction: CtxMW = async function(ctx, next) {
  const { banned, callbackQuery: { message } = {} } = ctx;
  if (!message) return ctx.cbQueryError();

  const toUnban = banned.get(message!.message_id);
  if (!toUnban) return ctx.cbQueryError();

  await ctx.deleteMessageWeak(toUnban.chatId, toUnban.resultMsgId);
  banned.delete(message!.message_id);
  return ctx.answerCbQuery();
};

/**
 * Checks if member (that reported) has admin status
 */
export const adminPermission: CtxMW = async function(ctx, next) {
  const { from } = ctx;
  if (!from) return false;
  const cm = await ctx.getChatMember(from.id);
  if (['administrator', 'creator'].includes(cm.status)) next!();
};

export const adminPermissionCBQuery: CtxMW = async function(ctx, next: any) {
  const { from } = ctx;
  if (!from) return false;
  const cm = await ctx.getChatMember(from.id);
  if (['administrator', 'creator'].includes(cm.status)) return next!();
  return ctx.answerCbQuery("🔓 You don' have permissions.");
};

/**
 * Checks if bot can ban and delete messages
 */
export const checkBotAdmin: CtxMW = async function(ctx, next) {
  if (await utils.iAmAdmin(ctx)) return next!();
  return ctx.replyTo(REPLICAS.i_am_not_admin);
};

export const checkBotAdminWeak: CtxMW = async function(ctx, next) {
  if (await utils.iAmAdmin(ctx)) return next!();
};

/**
 * Checks if user has not reported admin of bot itself
 */
export const safeBanReport: CtxMW = async function(ctx, next) {
  const reported = utils.getReportedUser(ctx);
  if (!reported) return;
  const cm = await ctx.getChatMember(reported.id);

  if (!['administrator', 'creator'].includes(cm.status)) return next!();
};

export const setVotebanThreshold: CtxMW = async function(ctx, next) {
  const { match, chat } = ctx;
  if (!(match && chat)) return;
  if (match[1]) {
    const th = +match[1];
    await db.setChatProp(chat, 'voteban_threshold', th);
    return ctx.replyTo(`Updated voteban threshold to ${th}.`);
  }
  const th = await db
    .getChat(chat)
    .then(c => c.voteban_threshold)
    .catch(() => 'not set');
  return ctx.replyTo(`Current voteban threshold: ${th}.`);
};

export const cancelLastVoteban: CtxMW = async function(ctx, next) {
  const { telegram: tg, votebans, chat } = ctx;
  if (!chat) return;
  const vbArr = Array.from(votebans);
  const lastVb = vbArr.find(v => v[1].chat.id == chat.id);
  if (!lastVb) return;
  await utils.runAll(
    ctx.deleteMessageWeak(chat.id, lastVb[1].reportMsg.message_id),
    ctx.deleteMessageWeak(chat.id, lastVb[1].pollMsg.message_id),
    ctx.deleteMessageWeak(chat.id, lastVb[1].reportMsg.message_id),
    ctx.deleteMessageWeak(chat.id, ctx.message?.message_id!)
  );
  votebans.delete(lastVb[0]);
};

export const register: CtxMW = async function(ctx, next) {
  const { chat } = ctx;
  if (!chat) return;
  await db.addChat(chat);
};
