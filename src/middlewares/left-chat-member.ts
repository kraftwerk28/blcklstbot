import { Composer } from "../composer.js";
import { captchaHash } from "../utils/event-queue.js";
import { botHasSufficientPermissions } from "../guards/index.js";
import { noop, safePromiseAll } from "../utils/index.js";

const composer = new Composer();

export default composer;

composer
  .on("message:left_chat_member")
  .filter(botHasSufficientPermissions)
  .use(async (ctx, next) => {
    await ctx.deleteMessage().catch(noop);
    // NOTE: this middleware works on two update types, so the
    // `left_chat_member` might actually be undefined
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const hash = captchaHash(ctx.chat.id, ctx.message.left_chat_member.id);
    const payload = await ctx.eventQueue.removeEvent<"captcha_timeout">(hash);
    if (payload) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, payload.captchaMessageId);
      } catch (err) {
        ctx.log.error(err);
      }
    }
    return next();
  });

composer
  .chatType(["group", "supergroup"])
  .on("chat_member")
  .filter(botHasSufficientPermissions)
  .use(async (ctx, next) => {
    const { old_chat_member, new_chat_member } = ctx.chatMember;
    const oldStatus = old_chat_member.status;
    const newStatus = new_chat_member.status;
    if (
      (oldStatus === "member" || oldStatus === "administrator") &&
      (newStatus === "left" || newStatus === "kicked")
    ) {
      ctx.log.info({ oldStatus, newStatus }, "User left the chat");
      const hash = captchaHash(ctx.chat.id, ctx.from.id);
      const payload = await ctx.eventQueue.removeEvent<"captcha_timeout">(hash);
      if (payload) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        safePromiseAll([
          ctx.api.deleteMessage(ctx.chat.id, payload.captchaMessageId),
        ]);
      }
    }
    return next();
  });
