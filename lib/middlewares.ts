import Telegraf, { Middleware, ContextMessageUpdate } from 'telegraf';
import { User, Message, Update, ExtraReplyMessage } from 'telegraf/typings/telegram-types';

import * as utils from './utils';
import { replicas as REPLICAS } from '../bot.config.json';
import { VotebanCooldown } from './votebanCD';
import { Report } from './bot';
import * as db from './db';
import { API, Banned } from './api';

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
    getUpdates(
      timeout?: number,
      limit?: number,
      offset?: number,
      allowed_updates?: string[]
    ): Promise<Update[]>;
    setMyCommands(commands: Command[]): Promise<boolean>;
  }

  export interface ComposerConstructor {
    drop<TContext extends ContextMessageUpdate>(
      test: boolean | ((ctx: TContext) => Promise<boolean>)
    ): Middleware<TContext>;
    admin<TContext extends ContextMessageUpdate>(
      ...middlewares: Middleware<TContext>[]
    ): Middleware<TContext>;
  }

  export interface ContextMessageUpdate {
    poll?: Poll;
    pollAnswer?: PollAnswer;
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
    db: typeof db;
    api: API;
    adminUID: number;
    reportsChannelID: number;
    reportsChannelUsername: string;
    commands: Command[];
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

  type PollType = 'quiz' | 'regular';
  type PollOption = { text: string; voter_count: number };

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

  interface Command {
    command: string;
    description: string;
  }
}

export const noPM: CtxMW = Telegraf.drop(async (ctx) => {
  const { chat, reply } = ctx;
  if (!chat) return false;
  const { type } = chat;

  if (['group', 'supergroup', 'channel'].includes(type)) return false;
  await reply(REPLICAS.private_messsages_restriction);
  return true;
});

export const addChat: CtxMW = async (ctx, next) => {
  const { chat, db, telegram } = ctx;
  if (chat && ['group', 'supergroup'].includes(chat.type)) {
    const added = await db.addChat(chat);
    if (added) {
      const newGroupMsg =
        '<b>New chat:</b>\n\n' +
        chat.title +
        `${chat.username ? ' @' + chat.username : ''}\n` +
        `id: <code>${chat.id}</code>`;
      await telegram.sendMessage(ctx.adminUID, newGroupMsg, {
        parse_mode: 'HTML',
      });
    }
  }
  return next!();
};

export const onNewMember: CtxMW = async function(ctx) {
  const { message, telegram: tg, reply, chat, db, api } = ctx;

  if (!(message && chat)) return;
  const newMembers = message.new_chat_members;
  if (!newMembers?.length) return;

  // if someone joined
  const dbGroup = await db.getChat(chat);
  if (dbGroup && dbGroup.voteban_to_global) {
    const banResults = await Promise.all(
      newMembers.map(async (member) => [
        member,
        Boolean(await api.checkUser(member.id))
      ] as [User, boolean])
    );

    const toBeBanned = banResults
      .filter(([_, ban]) => ban)
      .map(([member]) => member);

    if (toBeBanned.length && !(await utils.iAmAdmin(ctx))) {
      reply(REPLICAS.i_am_not_admin);
      return;
    }
    if (toBeBanned.length) {
      await ctx.deleteMessageWeak(chat.id, message.message_id);
    }
    await Promise.all(
      // toBeBanned.map(({ id }) => tg.kickChatMember(chat.id, id))
      toBeBanned.map((user) =>
        utils.kickUser(ctx, chat, user, utils.BanReason.AUTOBAN, false)
      )
    );
  }
};

export const onLeftMember: CtxMW = async function(ctx) {
  const {
    message,
    from,
    telegram: { getMe, deleteMessage },
  } = ctx;
};

export const onPoll: CtxMW = async function(ctx) {
  const { poll, votebans, db } = ctx;
  if (!poll) return;
  const voteban = votebans.get(ctx.poll!.id);
  // no votebans in memory
  if (!voteban) return;

  const { chat, pollMsg, reportedMsg, reportMsg, reportedUser } = voteban;
  const { voteban_threshold, voteban_to_global } = await db.getChat(chat);

  const [votedYes, votedNo] = poll.options.map((o) => o.voter_count);

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
        utils.BanReason.VOTEBAN,
        voteban_to_global,
        reportMsg,
        reportedMsg,
      ),
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
  await utils.checkUser(ctx);
  return next!();
};

export const debugInfo: CtxMW = async function({ message, reply }) {
  return reply(`<code>${JSON.stringify(message, null, 2)}</code>`, {
    parse_mode: 'HTML',
    reply_to_message_id: message!.message_id,
  });
};

export const getByUsernameReply: CtxMW = async function({
  message,
  chat,
  telegram,
  reply,
}) {
  const uId = message?.reply_to_message?.from?.id!;
  const user = await telegram.getChatMember(chat!.id, uId);
  return reply(`<code>${JSON.stringify(user.user, null, 2)}</code>`, {
    parse_mode: 'HTML',
  });
};

export const unbanAction: CtxMW = async function(ctx, next) {
  const { banned, callbackQuery: { message } = {}, api } = ctx;
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
  banned.delete(message!.message_id);

  if (toUnban) {
    await ctx.deleteMessageWeak(toUnban.chatId, toUnban.resultMsgId);
  } else {
    await ctx.deleteMessageWeak(message.chat.id, message.message_id);
  }
  return ctx.answerCbQuery();
};

/**
 * Checks if member (that reported) has admin status
 */
export const adminPermission: CtxMW = async function(ctx, next) {
  const { from, adminUID } = ctx;
  if (!from) return false;
  const cm = await ctx.getChatMember(from.id);
  if (
    ['administrator', 'creator'].includes(cm.status) ||
    from.id === adminUID
  ) {
    next!();
  }
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
  try {
    const admin = await utils.iAmAdmin(ctx);
    if (admin) return next!();
  } catch { }
};

/**
 * Checks if user has not reported admin of bot itself
 */
export const safeBanReport: CtxMW = async function(ctx, next) {
  const reported = utils.getReportedUser(ctx);
  if (!reported) return;
  const me = await ctx.telegram.getMe();
  const cm = await ctx.getChatMember(reported.id);

  if (
    !['administrator', 'creator'].includes(cm.status) &&
    reported.id !== me.id
  ) return next!();
};
