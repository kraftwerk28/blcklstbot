import { Markup } from 'telegraf';

import { HearsMiddleware } from '../types';
import { Composer } from '../composer';
import {
  botHasSufficientPermissions,
  messageIsReply,
  repliedMessageIsFromMember,
  senderIsAdmin,
} from '../guards';
import { bold, userMention, escape } from '../utils/html';
import { getDbUserFromReply, deleteMessage } from '../middlewares';
import { MAX_WARNINGS } from '../constants';
import { safePromiseAll } from '../utils';

export const report = Composer.branchAll(
  [
    botHasSufficientPermissions,
    senderIsAdmin,
    messageIsReply,
    repliedMessageIsFromMember,
  ],
  Composer.compose([
    getDbUserFromReply,
    async function (ctx) {
      await ctx.deleteMessage().catch();
      const isLastWarn = ctx.reportedUser.warnings_count === MAX_WARNINGS;
      const reportedUser = ctx.reportedUser;

      const reason = isLastWarn
        ? ctx.reportedUser.warn_ban_reason
        : ctx.match[1];
      const callbackData = `unban:${ctx.chat.id}:${reportedUser.id}`;
      const inlineKbd = Markup.inlineKeyboard([
        Markup.button.callback('\u{1f519} Undo', callbackData),
      ]);
      let text = ctx.t('report', {
        reporter: userMention(ctx.from),
        reported: userMention(reportedUser),
      });
      // let text =
      //   userMention(ctx.from) + ' banned ' + userMention(ctx.reportedUser);
      if (reason) {
        text += '\n' + ctx.t('report_reason', { reason: escape(reason) });
        // text += `\n${bold('Reason')}: ${}`;
      }

      const allUserMessageIds = await ctx.dbStore.getUserMessages(
        ctx.chat.id,
        reportedUser.id,
      );
      await Promise.allSettled(
        allUserMessageIds.map((id) => ctx.deleteMessage(id)),
      );

      if (ctx.dbChat.propagate_bans) {
        ctx.dbStore.updateUser({
          id: reportedUser.id,
          banned: true,
          warn_ban_reason: reason,
        });
      } else {
        ctx.dbStore.updateUser({
          chat_id: ctx.chat.id,
          id: reportedUser.id,
          banned: true,
          warn_ban_reason: reason,
          banned_timestamp: new Date(),
        });
      }

      return safePromiseAll([
        ctx.kickChatMember(reportedUser.id),
        ctx.replyWithHTML(text, { reply_markup: inlineKbd.reply_markup }),
      ]);
    } as HearsMiddleware,
  ]),
  deleteMessage,
);
