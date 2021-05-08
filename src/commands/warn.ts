import { User } from 'typegram';
import { HearsMiddleware } from '../types';
import {
  botHasSufficientPermissions,
  messageIsReply,
  repliedMessageIsFromMember,
  senderIsAdmin,
} from '../guards';
import { Composer } from '../composer';
import { bold, userMention, escape } from '../utils/html';
import { addRepliedUserToDatabase, deleteMessage } from '../middlewares';
import { MAX_WARNINGS } from '../constants';
import { report } from './report';

export const warn = Composer.branchAll(
  [
    botHasSufficientPermissions,
    senderIsAdmin,
    messageIsReply,
    repliedMessageIsFromMember,
  ],
  Composer.compose([
    addRepliedUserToDatabase,
    async function (ctx, next) {
      const reply = ctx.message.reply_to_message!;
      const reportedUserFromDb = ctx.reportedUser;
      let reportedUser: User;
      let warnReason: string;

      if (reportedUserFromDb.warnings_count === MAX_WARNINGS) {
        return report(ctx, next);
      }
      await ctx.deleteMessage().catch();

      const reasonFromCommand = ctx.match[1];
      if (reportedUserFromDb.warnings_count === 0) {
        if (reasonFromCommand) {
          warnReason = reasonFromCommand;
        } else {
          return next();
        }
      } else {
        warnReason = reportedUserFromDb.warn_ban_reason!;
        if (reasonFromCommand) {
          warnReason += '\n' + reasonFromCommand;
        }
      }

      // TODO: handle `chat_member`
      if ('new_chat_members' in reply) {
        reportedUser = reply.new_chat_members[0];
      } else if (reply.from) {
        reportedUser = reply.from;
      } else {
        return next();
      }

      const newWarningsCount = reportedUserFromDb.warnings_count + 1;
      const isLastWarn = newWarningsCount === MAX_WARNINGS;

      let text = `${userMention(ctx.from)} warned ${userMention(
        reportedUser,
      )} `;
      if (isLastWarn) {
        text += bold('(last warning!)');
      } else {
        text += bold(`(${newWarningsCount} / ${MAX_WARNINGS})`);
      }
      text += `\n${bold('Reason')}: ${escape(warnReason)}`;

      // TODO: remove messages by user
      return Promise.all([
        ctx.replyWithHTML(text),
        ctx.dbStore.updateUser({
          id: reportedUser.id,
          warnings_count: newWarningsCount,
          warn_ban_reason: warnReason,
        }),
      ]);
    } as HearsMiddleware,
  ]),
  deleteMessage,
);
