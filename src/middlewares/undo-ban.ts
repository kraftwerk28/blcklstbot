import { ActionMiddleware } from '../types';
import { Composer } from '../composer';
import { senderIsAdmin } from '../guards';
import { userMention } from '../utils/html';
import { addRepliedUserToDatabase } from './add-replied-user-to-database';

export const undoBan = Composer.branch(
  senderIsAdmin,
  Composer.compose([
    addRepliedUserToDatabase,
    async function(ctx) {
      const [, reporterUserId, reportedUserId] = ctx.match.map((n) =>
        parseInt(n),
      );
      await ctx.unbanChatMember(reportedUserId);
      if (ctx.callbackQuery.message) {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
      }
      const [reporterUser, reportedUser] = await Promise.all([
        ctx.getChatMember(reporterUserId),
        ctx.getChatMember(reportedUserId),
      ]);
      await ctx.reply(
        `${userMention(reporterUser.user)} pardoned` +
        ` ${userMention(reportedUser.user)}.`,
      );
      await ctx.dbStore.updateUser({
        id: reportedUserId,
        warnings_count: 0,
        banned: false,
        warn_ban_reason: null,
      });
    } as ActionMiddleware,
  ]),
  async function(ctx) {
    return ctx.answerCbQuery("You don't have permission to pardon user", {
      show_alert: true,
    });
  } as ActionMiddleware,
);
