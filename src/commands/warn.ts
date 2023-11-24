import { botHasSufficientPermissions, senderIsAdmin } from "../guards/index.js";
import { bold, userMention, escape } from "../utils/html.js";
import { MAX_WARNINGS } from "../constants.js";
import report from "./report.js";
import { noop, safePromiseAll } from "../utils/index.js";
import { Composer } from "../composer.js";
import obtainReportedUser from "../middlewares/get-reported-user.js";
import splitArgs from "../middlewares/split-args.js";

const composer = new Composer();

export default composer;

composer
  .on("message")
  .command("warn", splitArgs)
  .filter(botHasSufficientPermissions)
  .filter(senderIsAdmin)
  .use(obtainReportedUser, async (ctx, next) => {
    const reportedUser = ctx.reportedUser!;
    const chatId = ctx.chat.id;
    let warnReason: string;

    if (reportedUser.warnings_count === MAX_WARNINGS) {
      return report.middleware()(ctx, next);
    }
    await ctx.deleteMessage().catch(noop);

    const reasonFromCommand = ctx.commandArgs.shift();
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
      ctx.t("warn", {
        reporter: userMention(ctx.from),
        reported: userMention(reportedUser),
      }) + " ";
    if (isLastWarn) {
      text += `(${ctx.t("last_warning")})`;
    } else {
      text += bold(`(${newWarningsCount} / ${MAX_WARNINGS})`);
    }
    text += "\n" + ctx.t("report_reason", { reason: escape(warnReason) });

    return safePromiseAll([
      ctx.reply(text, { parse_mode: "HTML" }),
      ctx.dbStore.updateUser({
        id: reportedUser.id,
        chat_id: chatId,
        warnings_count: newWarningsCount,
        warn_ban_reason: warnReason,
      }),
    ]);
  });
