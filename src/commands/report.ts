import { InlineKeyboard } from "grammy";

import { Composer } from "../composer.js";
import { botHasSufficientPermissions, senderIsAdmin } from "../guards/index.js";
import { userMention, escape } from "../utils/html.js";
import { MAX_WARNINGS } from "../constants.js";
import { safePromiseAll } from "../utils/index.js";
import obtainReportedUser from "../middlewares/get-reported-user.js";
import splitArgs from "../middlewares/split-args.js";

const composer = new Composer();

const noop = () => {
  // Noop
};

composer
  .chatType(["group", "supergroup"])
  .on("message")
  .command("report", splitArgs)
  .use(
    botHasSufficientPermissions,
    obtainReportedUser,
    senderIsAdmin,
    async (ctx) => {
      await ctx.deleteMessage().catch(noop);
      const reportedUser = ctx.reportedUser!;
      const isLastWarn = reportedUser.warnings_count === MAX_WARNINGS;
      const reason = isLastWarn
        ? reportedUser.warn_ban_reason
        : ctx.commandArgs.shift();

      const callbackData = `unban:${ctx.chat.id}:${reportedUser.id}`;
      const inlineKbd = new InlineKeyboard().text(
        "\u{1f519} Undo",
        callbackData,
      );
      let text = ctx.t("report", {
        reporter: userMention(ctx.from),
        reported: userMention(reportedUser),
      });
      if (reason) {
        text += "\n" + ctx.t("report_reason", { reason: escape(reason) });
      }

      const allUserMessageIds = await ctx.dbStore.getUserMessages(
        ctx.chat.id,
        reportedUser.id,
      );
      // TODO: will this fail if count of message is too large?
      await Promise.allSettled(
        allUserMessageIds.map((id) => ctx.api.deleteMessage(ctx.chat.id, id)),
      );

      if (ctx.dbChat.propagate_bans) {
        await ctx.dbStore.updateUser({
          id: reportedUser.id,
          banned: true,
          warn_ban_reason: reason,
        });
      } else {
        await ctx.dbStore.updateUser({
          chat_id: ctx.chat.id,
          id: reportedUser.id,
          banned: true,
          warn_ban_reason: reason,
          banned_timestamp: new Date(),
        });
      }

      return safePromiseAll([
        ctx.banChatMember(reportedUser.id),
        ctx.reply(text, { parse_mode: "HTML", reply_markup: inlineKbd }),
      ]);
    },
  );

export default composer;
