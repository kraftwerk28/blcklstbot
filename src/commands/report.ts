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
      const callbackData = `undo_ban:${ctx.from.id}:${reportedUser.id}`;
      const inlineKbd = Markup.inlineKeyboard([
        Markup.button.callback('\u{1f519} Undo', callbackData),
      ]);
      let text =
        userMention(ctx.from) + ' banned ' + userMention(ctx.reportedUser);
      if (reason) {
        text += `\n${bold('Reason')}: ${escape(reason)}`;
      }

      const allUserMessageIds = await ctx.dbStore.getUserMessages(
        ctx.chat.id,
        reportedUser.id,
      );

      if (ctx.dbChat.propagate_bans) {
        // TODO: ban in other chats
      }

      return safePromiseAll([
        ctx.kickChatMember(reportedUser.id),
        ctx.replyWithHTML(text, { reply_markup: inlineKbd.reply_markup }),
        Promise.allSettled(
          allUserMessageIds.map(async (id) => await ctx.deleteMessage(id)),
        ),
        ctx.dbStore.updateUser({
          id: reportedUser.id,
          banned: true,
          warn_ban_reason: reason,
        }),
      ]);
    } as HearsMiddleware,
  ]),
  deleteMessage,
);
