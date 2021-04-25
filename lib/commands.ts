import { Telegraf } from 'telegraf';
import { Message } from 'typegram';

import * as utils from './utils';
import { CommandHandler, Ctx, Middleware, Report } from './types';
import { log } from './logger';

export const report: CommandHandler = async function(ctx, next) {
  const { message, chat, pg } = ctx;
  if (!chat) {
    return;
  }
  const reportedMsg = message.reply_to_message;
  const reportedUser = utils.getReportedUser(ctx);
  const dbGroup = await pg.getChat(chat);

  // check if command is replying
  if (!reportedMsg || !reportedUser) return;

  try {
    await utils.kickUser(
      ctx,
      chat,
      reportedUser,
      utils.BanReason.Report,
      dbGroup && dbGroup.voteban_to_global,
      message,
      (reportedMsg as Message.NewChatMembersMessage).new_chat_members
        ? undefined
        : reportedMsg,
    );
    await Promise.allSettled([
      ctx.deleteMessage(reportedMsg.message_id),
      ctx.deleteMessage(message.message_id),
    ]);
  } catch (err) {
    log.error(err);
  }
};

export const help: Middleware = async function(ctx) {
  const text = ctx.commands.reduce((acc, { command, description }) => {
    return acc + `/${command} - ${description}\n`;
  }, '');
  return ctx.reply(text, { reply_to_message_id: ctx.message?.message_id });
};

export const stopVoteban: CommandHandler = async function(ctx, next) {
  const isAdminMsg = await utils.checkAdmin(ctx);
  if (!isAdminMsg) return next!();

  ctx.votebanCD.cd(ctx.chat!.id);
};

export const voteban: CommandHandler = async function(ctx) {
  const { chat, message, from, votebans } = ctx;
  if (!(chat && message && from)) return;
  if (!message.reply_to_message) return;

  // check voteban cooldown
  if (ctx.votebanCD.has(chat.id)) return;

  const reportedUser = utils.getReportedUser(ctx);
  if (!reportedUser) return;

  if (
    Array.from(votebans).find((v) => v[1].reportedUser.id === reportedUser.id)
  )
    return;

  const pollMsg = await ctx.replyWithPoll(
    `Ban ${utils.mention(reportedUser)}` +
    ` (reported by ${utils.mention(from)})?`,
    ['Yes.', 'No.'],
    {},
  );

  const pollId = (pollMsg as any).poll.id;
  const vb: Report = {
    chat,
    reportedUser,
    reportMsg: message,
    pollMsg,
    reportedMsg: message.reply_to_message,
  };
  votebans.set(pollId, vb);
};

export const setVotebanThreshold = Telegraf.command<Ctx>(
  'set_voteban_threshold',
  async (ctx, next) => {
    const { match, chat, pg, message } = ctx;
    if (!(match && chat)) return;
    if (match[1]) {
      const th = +match[1];
      await pg.setChatProp(chat, 'voteban_threshold', th);
      return ctx.reply(
        `Updated voteban threshold to ${th}.`,
        { reply_to_message_id: message?.message_id }
      );
    }
    const th = await pg
      .getChat(chat)
      .then((c: any) => c.voteban_threshold)
      .catch(() => 'not set');
    return ctx.reply(
      `Current voteban threshold: ${th}.`,
      { reply_to_message_id: message?.message_id },
    );
  }
);

export const cancelLastVoteban: CommandHandler = async function(ctx, next) {
  const { votebans, chat } = ctx;
  if (!chat) return;
  const vbArr = Array.from(votebans);
  const lastVb = vbArr.find((v) => v[1].chat.id == chat.id);
  if (!lastVb) return;
  try {
    await Promise.allSettled([
      ctx.deleteMessage(lastVb[1].reportMsg.message_id),
      ctx.deleteMessage(lastVb[1].pollMsg.message_id),
      ctx.deleteMessage(lastVb[1].reportMsg.message_id),
      ctx.deleteMessage(ctx.message?.message_id!)
    ]);
  } catch (err) {
    log.error(err);
  }
  votebans.delete(lastVb[0]);
};
