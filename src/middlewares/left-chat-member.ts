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
    if (ctx.message.left_chat_member) {
      const hash = captchaHash(ctx.chat.id, ctx.message.left_chat_member.id);
      const payload = await ctx.eventQueue.removeEvent<"captcha_timeout">(hash);
      if (payload) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        safePromiseAll([
          ctx.api.deleteMessage(ctx.chat.id, payload.captchaMessageId),
          ctx.api.deleteMessage(ctx.chat.id, payload.newChatMemberMessageId),
        ]);
      }
    } else if (ctx.chatMember) {
      // TODO:
    }
    return next();
  });
