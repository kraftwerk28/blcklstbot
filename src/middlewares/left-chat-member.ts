import { Composer } from '../composer';
import { captchaHash } from '../utils/event-queue';
import { OnMiddleware } from '../types';
import { botHasSufficientPermissions } from '../guards';
import { noop, safePromiseAll } from '../utils';

type Middleware = OnMiddleware<'left_chat_member' | 'chat_member'>;

export const leftChatMember = Composer.optional(
  botHasSufficientPermissions,
  async function(ctx, next) {
    if (!ctx.message) return next();
    await ctx.deleteMessage().catch(noop);
    if (ctx.message.left_chat_member) {
      const hash = captchaHash(ctx.chat.id, ctx.message.left_chat_member.id);
      const payload = await ctx.eventQueue.removeEvent<'captcha_timeout'>(hash);
      if (payload) {
        safePromiseAll([
          ctx.deleteMessage(payload.captchaMessageId),
          ctx.deleteMessage(payload.newChatMemberMessageId),
        ]);
      }
    } else if (ctx.chatMember) {
      // TODO:
    }
    return next();
  } as Middleware,
);
