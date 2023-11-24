import { Composer } from "../composer.js";
import { captchaHash } from "../utils/event-queue.js";
import { checkCaptchaAnswer as checkAnswer } from "../captcha/index.js";
import { noop } from "../utils/index.js";
import { botHasSufficientPermissions } from "../guards/index.js";

const composer = new Composer();
export default composer;

composer
  .on("message")
  .chatType(["group", "supergroup"])
  .filter(botHasSufficientPermissions)
  .use(async (ctx, next) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const captcha = await ctx.dbStore.hasPendingCaptcha(chatId, userId);
    if (!captcha) return next();
    const correct = checkAnswer(ctx, captcha);
    await ctx.deleteMessage().catch(noop);
    if (correct) {
      await ctx.dbStore.deletePendingCaptcha(chatId, userId);
      ctx.log.info({ user: ctx.from, captcha }, "User completed the captcha");
      const payload = await ctx.eventQueue.removeEvent<"captcha_timeout">(
        captchaHash(chatId, userId),
      );
      if (!payload) return;
      await ctx.api.deleteMessage(chatId, payload.captchaMessageId);
    }
  });
