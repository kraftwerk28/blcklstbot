import { Composer } from '../composer';
import { captchaHash } from '../utils/event-queue';
import { OnMiddleware } from '../types';
import { botHasSufficientPermissions } from '../guards';
import { getLeftMemberFromUpdate, noop, safePromiseAll } from '../utils';

type Middleware = OnMiddleware<'left_chat_member' | 'chat_member'>;

export const leftChatMember = Composer.optional(
  botHasSufficientPermissions,
  async function(ctx, next) {
    if (!ctx.message) return next();
    if (ctx.dbChat.delete_joins) {
      await ctx.deleteMessage().catch(noop);
    }
    const leftMember = getLeftMemberFromUpdate(ctx.update);
    if (leftMember) {
      const hash = captchaHash(ctx.chat.id, leftMember.id);
      const payload = await ctx.eventQueue.removeEvent<'captcha_timeout'>(hash);
      if (payload) {
        await safePromiseAll([
          ctx.deleteMessage(payload.captchaMessageId),
          ctx.deleteMessage(payload.newChatMemberMessageId),
        ]);
      }
    }
    return next();
  } as Middleware,
);
