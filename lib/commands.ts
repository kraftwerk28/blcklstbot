import { Middleware, ContextMessageUpdate } from 'telegraf';

import * as utils from './utils';
import { Report } from './bot';
import { helpText } from './helpText';

type CtxMW = Middleware<ContextMessageUpdate>;

export const report: CtxMW = async function (ctx) {
  const { message, telegram: tg, chat, from, db } = ctx;
  if (!(from && chat && message)) return;
  const admins = await tg.getChatAdministrators(chat.id);
  const reportedMsg = message.reply_to_message;
  const reportedUser = utils.getReportedUser(ctx);
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
    reportedMsg.new_chat_members ? undefined : reportedMsg,
    dbGroup && dbGroup.voteban_to_global
  );

  await utils.runAll(
    ctx.deleteMessageWeak(chat.id, reportedMsg.message_id),
    ctx.deleteMessageWeak(chat.id, message.message_id)
  );
};

export const help: CtxMW = async function (ctx) {
  return ctx.replyTo(helpText());
};

export const stopVoteban: CtxMW = async function (ctx, next) {
  const isAdminMsg = await utils.checkAdmin(ctx);
  if (!isAdminMsg) return next!();

  ctx.votebanCD.cd(ctx.chat!.id);
};

export const voteban: CtxMW = async function (ctx) {
  const { chat, message, from, telegram, votebans } = ctx;
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
    reportedMsg: message.reply_to_message,
  };
  votebans.set(pollId, vb);
};

export const setVotebanThreshold: CtxMW = async function (ctx, next) {
  const { match, chat, db } = ctx;
  if (!(match && chat)) return;
  if (match[1]) {
    const th = +match[1];
    await db.setChatProp(chat, 'voteban_threshold', th);
    return ctx.replyTo(`Updated voteban threshold to ${th}.`);
  }
  const th = await db
    .getChat(chat)
    .then((c) => c.voteban_threshold)
    .catch(() => 'not set');
  return ctx.replyTo(`Current voteban threshold: ${th}.`);
};

export const cancelLastVoteban: CtxMW = async function (ctx, next) {
  const { telegram: tg, votebans, chat } = ctx;
  if (!chat) return;
  const vbArr = Array.from(votebans);
  const lastVb = vbArr.find((v) => v[1].chat.id == chat.id);
  if (!lastVb) return;
  await utils.runAll(
    ctx.deleteMessageWeak(chat.id, lastVb[1].reportMsg.message_id),
    ctx.deleteMessageWeak(chat.id, lastVb[1].pollMsg.message_id),
    ctx.deleteMessageWeak(chat.id, lastVb[1].reportMsg.message_id),
    ctx.deleteMessageWeak(chat.id, ctx.message?.message_id!)
  );
  votebans.delete(lastVb[0]);
};
