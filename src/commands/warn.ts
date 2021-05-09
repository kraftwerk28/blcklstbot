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
import { getDbUserFromReply, deleteMessage } from '../middlewares';
import { MAX_WARNINGS } from '../constants';
import { report } from './report';
import { safePromiseAll } from '../utils';

export const warn = Composer.branchAll(
  [
    botHasSufficientPermissions,
    senderIsAdmin,
    messageIsReply,
    repliedMessageIsFromMember,
  ],
  Composer.compose([
    getDbUserFromReply,
    async function (ctx, next) {
      const reportedUser = ctx.reportedUser;
      let warnReason: string;

      if (reportedUser.warnings_count === MAX_WARNINGS) {
        return report(ctx, next);
      }
      await ctx.deleteMessage().catch();

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
        `${userMention(ctx.from)} warned ` + `${userMention(reportedUser)} `;
      if (isLastWarn) {
        text += bold('(last warning!)');
      } else {
        text += bold(`(${newWarningsCount} / ${MAX_WARNINGS})`);
      }
      text += `\n${bold('Reason')}: ${escape(warnReason)}`;

      // TODO: remove messages by user
      return safePromiseAll([
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
