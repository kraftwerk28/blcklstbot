import { User } from 'typegram';

import { replicas as REPLICAS } from '../bot.config.json';
import * as utils from './utils';
import { Ctx, Middleware, OnMiddleware } from './types';
import { log } from './logger';

export const noPM: Middleware = async (ctx, next) => {
  switch (ctx.chat?.type) {
    case 'group':
    case 'supergroup':
    case 'channel':
      return next();
    case 'private':
      await ctx.reply(REPLICAS.private_messsages_restriction);
      break;
    case 'channel':
      break;
  }
};

export const addChat: Middleware = async (ctx, next) => {
  const { chat, pg, tg } = ctx;

  if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
    const wasAdded = await pg.addChat(chat);

    if (wasAdded) {
      const newGroupMsg =
        '<b>New chat joined!</b>\n' +
        `  title: ${chat.title}\n` +
        `  id: <code>${chat.id}</code>`;

      await tg
        .sendMessage(ctx.adminUId, newGroupMsg, { parse_mode: 'HTML' })
        .catch();
    }
  }
  return next();
};

export const onNewMember: OnMiddleware<'new_chat_members'> = async function(ctx, next) {
  const { message, tg, reply, chat, api, pg } = ctx;

  const newMembers = message.new_chat_members;
  if (!newMembers?.length || !chat) return;

  // if someone joined
  const dbGroup = await pg.getChat(chat);
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

    if (toBeBanned.length && chat && message) {
      await tg.deleteMessage(chat.id, message.message_id).catch();
    }

    if (chat) {
      await Promise.all(
        // toBeBanned.map(({ id }) => tg.kickChatMember(chat.id, id))
        toBeBanned.map((user) =>
          utils.kickUser(ctx, chat, user, utils.BanReason.Autoban, false)
        )
      );
    }
  }
};

export const onLeftMember: Middleware = async function(ctx) {
  const {
    message,
    from,
    telegram: { getMe, deleteMessage },
  } = ctx;
};

export const onPoll: Middleware = async function(ctx) {
  const { poll, votebans, pg, tg } = ctx;
  if (!poll) return;
  const voteban = votebans.get(ctx.poll!.id);
  // no votebans in memory
  if (!voteban) return;

  const { chat, pollMsg, reportedMsg, reportMsg, reportedUser } = voteban;
  const { voteban_threshold, voteban_to_global } = await pg.getChat(chat);

  const [votedYes, votedNo] = poll.options.map((o) => o.voter_count);

  const diff = votedYes - votedNo;
  if (diff >= voteban_threshold) {
    votebans.delete(poll.id);

    await Promise.allSettled([
      tg.deleteMessage(chat.id, pollMsg.message_id),
      reportedMsg && tg.deleteMessage(chat.id, reportedMsg.message_id),
      tg.deleteMessage(chat.id, reportMsg.message_id),
      utils.kickUser(
        ctx,
        chat,
        reportedUser,
        utils.BanReason.Voteban,
        voteban_to_global,
        reportMsg,
        reportedMsg,
      ),
    ]).catch();
  } else if (-diff >= voteban_threshold) {
    await Promise.allSettled([
      tg.deleteMessage(chat.id, pollMsg.message_id),
      tg.deleteMessage(chat.id, reportMsg.message_id)
    ]).catch();
  }
};

export const onText: Middleware = async function(ctx, next) {
  const { chat } = ctx;
  if (!chat) return;
  await utils.checkUser(ctx);
  return next!();
};

export const debugInfo: Middleware = async function({ message, reply }) {
  return reply(`<code>${JSON.stringify(message, null, 2)}</code>`, {
    parse_mode: 'HTML',
    reply_to_message_id: message!.message_id,
  });
};

export const getByUsernameReply: Middleware = async function({
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

export const unbanAction: Middleware = async function(ctx, next) {
  const { banned, callbackQuery: { message } = {}, api } = ctx;
  if (!message) return ctx.cbQueryError();

  const toUnban = banned.get(message!.message_id);
  if (!toUnban) return ctx.cbQueryError();

  await utils.runAll(
    ctx.telegram.unbanChatMember(toUnban.chatId, toUnban.userId),
    tg.deleteMessage(toUnban.chatId, toUnban.resultMsgId),
    api.rmUser(toUnban.userId)
  );
  banned.delete(message.message_id);
  return ctx.answerCbQuery('✅ Unbanned.');
};

export const deleteMessageAction: Middleware = async function(ctx, next) {
  const { banned, callbackQuery: { message } = {}, tg } = ctx;
  if (!message) {
    return ctx.answerCbQuery('An error occured', { show_alert: false });
  }

  const toUnban = banned.get(message!.message_id);
  banned.delete(message!.message_id);

  if (toUnban) {
    await tg.deleteMessage(toUnban.chatId, toUnban.resultMsgId);
  } else {
    await tg.deleteMessage(message.chat.id, message.message_id);
  }
  return ctx.answerCbQuery();
};

/**
 * Checks if member (that reported) has admin status
 */
export const adminPermission: Middleware = async function(ctx, next) {
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

export const adminPermissionCBQuery: Middleware = async function(ctx, next: any) {
  const { from } = ctx;
  if (!from) return false;
  const cm = await ctx.getChatMember(from.id);
  if (['administrator', 'creator'].includes(cm.status)) return next!();
  return ctx.answerCbQuery("🔓 You don' have permissions.");
};

/**
 * Checks if bot has proper permissions
 * Flag is stored in expirable redis key
 * @param verbose - Screams in chat about missing permissions
 */
export const checkIfBotIsAdmin = (verbose: boolean): Middleware =>
  async (ctx, next) => {
    let isAdmin = false;
    try {
      const chatId = ctx.chat?.id;
      if (chatId !== undefined) {
        const isAdminCached = await ctx.redis.checkBotAdminStatus(chatId);
        if (isAdminCached === null) {
          const meMember = await ctx.tg.getChatMember(chatId, ctx.botInfo.id);
          isAdmin = Boolean(
            meMember.can_restrict_members && meMember.can_delete_messages
          );
          await ctx.redis.setBotAdminStatus(chatId, isAdmin);
        } else {
          isAdmin = isAdminCached;
        }
      }
    } catch (err) {
      log.error(err);
    }

    if (isAdmin) {
      return next();
    } else if (verbose) {
      return ctx.reply(REPLICAS.i_am_not_admin);
    }
  };

/** Checks if bot or reporter or admin wasn't reported */
export const validateReportCmd: Middleware = async function(ctx, next) {
  const reported = utils.getReportedUser(ctx);
  if (!reported) return;
  const me = await ctx.telegram.getMe();
  const cm = await ctx.getChatMember(reported.id);

  if (
    !['administrator', 'creator'].includes(cm.status) &&
    reported.id !== me.id
  ) return next!();
};
