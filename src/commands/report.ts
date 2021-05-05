import { Markup } from 'telegraf';
import { User } from 'typegram';

import { HearsMiddleware } from '../types';
import { Composer } from '../composer';
import {
  botHasSufficientPermissions,
  messageIsReply,
  senderIsAdmin,
} from '../guards';
import { bold, userMention, escape } from '../utils/html';

export const report = Composer.guardAll(
  [botHasSufficientPermissions, senderIsAdmin, messageIsReply],
  async function(ctx, next) {
    const reply = ctx.message.reply_to_message!;
    let reportedUser: User;

    // TODO: handle `chat_member`
    if ('new_chat_members' in reply) {
      reportedUser = reply.new_chat_members[0];
    } else if (reply.from) {
      reportedUser = reply.from;
    } else {
      return next();
    }

    const reason = ctx.match[1];
    const callbackData = `undo_ban:${ctx.from.id}:${reportedUser.id}`;
    const inlineKbd = Markup.inlineKeyboard([
      Markup.button.callback('\u2b05\ufe0f Undo', callbackData),
    ]);
    let text = `${userMention(ctx.from)} banned ${userMention(reportedUser)}`;
    if (reason) {
      text += `\n${bold('Reason')}: ${escape(reason)}.`;
    }

    // TODO: remove messages by user
    return Promise.all([
      ctx.kickChatMember(reportedUser.id),
      ctx.deleteMessage(),
      ctx.replyWithHTML(text, { reply_markup: inlineKbd.reply_markup }),
    ]);
  } as HearsMiddleware,
);
