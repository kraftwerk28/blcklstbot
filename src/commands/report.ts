import { Markup } from 'telegraf';
import { User } from 'typegram';

import { HearsMiddleware } from '../types';
import { Composer } from '../composer';
import {
  botHasSufficientPermissions,
  messageIsReply,
  repliedMessageIsFromMember,
  senderIsAdmin,
} from '../guards';
import { bold, userMention, escape } from '../utils/html';
import { addRepliedUserToDatabase, deleteMessage } from '../middlewares';
import { MAX_WARNINGS } from '../constants';

export const report = Composer.branchAll(
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
      let reportedUser: User;
      await ctx.deleteMessage().catch();
      const isLastWarn = ctx.reportedUser.warnings_count === MAX_WARNINGS;

      // TODO: handle `chat_member`
      if ('new_chat_members' in reply) {
        reportedUser = reply.new_chat_members[0];
      } else if (reply.from) {
        reportedUser = reply.from;
      } else {
        return next();
      }

      const reason = isLastWarn
        ? ctx.reportedUser.warn_ban_reason
        : ctx.match[1];
      const callbackData = `undo_ban:${ctx.from.id}:${reportedUser.id}`;
      const inlineKbd = Markup.inlineKeyboard([
        Markup.button.callback('\u2b05\ufe0f Undo', callbackData),
      ]);
      let text = `${userMention(ctx.from)} banned ${userMention(reportedUser)}`;
      if (reason) {
        text += `\n${bold('Reason')}: ${escape(reason)}`;
      }

      const allUserMessageIds = await ctx.dbStore.getUserMessages(
        ctx.chat.id,
        reportedUser.id,
      );

      return Promise.all([
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
