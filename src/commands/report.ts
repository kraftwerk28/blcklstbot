import { Composer } from "../composer.js";
import { botHasSufficientPermissions, senderIsAdmin } from "../guards/index.js";
import { MAX_WARNINGS } from "../constants.js";
import resolveReportedUser from "../middlewares/get-reported-user.js";
import splitArgs from "../middlewares/split-args.js";

const composer = new Composer();

composer
  .chatType(["group", "supergroup"])
  .on("message")
  .command("report", splitArgs)
  .filter(botHasSufficientPermissions)
  .filter(senderIsAdmin)
  .use(resolveReportedUser, async (ctx, next) => {
    const { reportedUser } = ctx;
    if (!reportedUser) return next();
    const isLastWarn = reportedUser.warnings_count === MAX_WARNINGS;
    const reason = isLastWarn
      ? reportedUser.warn_ban_reason ?? undefined
      : ctx.match
    await ctx.banUser(reportedUser, ctx.from, reason);
  });

export default composer;
