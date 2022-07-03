import { HearsMiddleware } from '../types';
import {
  botHasSufficientPermissions,
  messageIsReply,
  repliedMessageIsFromMember,
  senderIsAdmin,
} from '../guards';
import { Composer } from '../composer';
import { getDbUserFromReply, deleteMessage } from '../middlewares';
import { MAX_WARNINGS } from '../constants';
import { report } from './report';
import { noop, html } from '../utils';

const warnHandler: HearsMiddleware = async function (ctx, next) {
  const reportedUser = ctx.reportedUser;
  const chatId = ctx.chat.id;
  let warnReason: string;

  if (reportedUser.warnings_count === MAX_WARNINGS) {
    return report(ctx, next);
  }
  await ctx.deleteMessage().catch(noop);

  const reasonFromCommand = ctx.match[1];
  if (reportedUser.warnings_count === 0) {
    if (reasonFromCommand) {
      warnReason = reasonFromCommand;
    } else {
      return next();
    }
  } else {
    warnReason = reportedUser.warn_ban_reason!;
    if (reasonFromCommand) {
      warnReason += `, ${reasonFromCommand}`;
    }
  }

  const newWarningsCount = reportedUser.warnings_count + 1;
  const isLastWarn = newWarningsCount === MAX_WARNINGS;

  let text =
    ctx.t('warn', {
      reporter: html.userMention(ctx.from),
      reported: html.userMention(reportedUser),
    }) + ' ';
  if (isLastWarn) {
    text += `(${ctx.t('last_warning')})`;
  } else {
    text += html.bold(`(${newWarningsCount} / ${MAX_WARNINGS})`);
  }
  text += '\n' + ctx.t('report_reason', { reason: html.escape(warnReason) });

  await ctx.dbStore.updateUser({
    id: reportedUser.id,
    chat_id: chatId,
    warnings_count: newWarningsCount,
    warn_ban_reason: warnReason,
  });
  await ctx.deleteMessage(ctx.message.reply_to_message!.message_id).catch(noop);
  await ctx.replyWithHTML(text);
};

export const warn = Composer.branch(
  Composer.allOf(
    botHasSufficientPermissions,
    senderIsAdmin,
    messageIsReply,
    repliedMessageIsFromMember,
  ),
  Composer.compose([getDbUserFromReply, warnHandler]),
  deleteMessage,
);
