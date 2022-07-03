import { HearsMiddleware } from "../types";
import { Composer } from "../composer";
import {
  botHasSufficientPermissions,
  messageIsReply,
  repliedMessageIsFromMember,
  senderIsAdmin,
} from "../guards";
import { getDbUserFromReply, deleteMessage } from "../middlewares";
import { MAX_WARNINGS } from "../constants";
import { noop, safePromiseAll, html } from "../utils";
import { Chat } from "typegram";

const reportByAdmin = async function (ctx) {
  await ctx.deleteMessage().catch(noop);
  const isLastWarn = ctx.reportedUser.warnings_count >= MAX_WARNINGS;
  const { reportedUser, chat } = ctx;

  const reason = isLastWarn ? ctx.reportedUser.warn_ban_reason : ctx.match[1];
  let text = ctx.t("report", {
    reporter: html.userMention(ctx.from),
    reported: html.userMention(reportedUser),
  });
  if (reason) {
    text += "\n" + ctx.t("report_reason", { reason: html.escape(reason) });
  }

  const allUserMessageIds = await ctx.dbStore.getUserMessages(
    chat.id,
    reportedUser.id,
  );
  await safePromiseAll(allUserMessageIds.map(id => ctx.deleteMessage(id)));

  if (ctx.dbChat.propagate_bans) {
    await ctx.dbStore.updateUser({
      id: reportedUser.id,
      banned: true,
      warn_ban_reason: reason,
      banned_timestamp: new Date(),
    });
  } else {
    await ctx.dbStore.updateUser({
      chat_id: chat.id,
      id: reportedUser.id,
      banned: true,
      warn_ban_reason: reason,
      banned_timestamp: new Date(),
    });
  }
  await ctx.kickChatMember(reportedUser.id);
  await ctx.replyWithHTML(text);
} as HearsMiddleware;

const reportByMember = async function (ctx) {
  const admins = await ctx.getChatAdministrators();
  const chat = ctx.chat as Chat.GroupChat | Chat.SupergroupChat;
  let chatString = `"${html.bold(chat.title)}"`;
  if ("username" in chat) {
    chatString += ` (@${chat.username})`;
  }

  const text = ctx.t("user_report_admin_pm", {
    reporter: html.userMention(ctx.from),
    reportee: html.userMention(ctx.reportedUser),
    chat: chatString,
  });

  await safePromiseAll(
    admins
      .filter(cm => !cm.user.is_bot)
      .map(cm =>
        ctx.telegram.sendMessage(cm.user.id, text, { parse_mode: "HTML" }),
      ),
  );
} as HearsMiddleware;

const askForPermissionsInChat = async function (ctx) {} as HearsMiddleware;

export const report = Composer.branch(
  Composer.allOf(messageIsReply, repliedMessageIsFromMember),
  Composer.branch(
    botHasSufficientPermissions,
    Composer.compose([
      getDbUserFromReply,
      Composer.branch(senderIsAdmin, reportByAdmin, reportByMember),
    ]),
    askForPermissionsInChat,
  ),
  deleteMessage,
);
