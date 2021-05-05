import { Composer } from '../composer';
import { senderIsAdmin } from '../guards';
import { CommandMiddleware } from '../types';

export const delMessage = Composer.optional(
  senderIsAdmin,
  async function(ctx) {
    if (ctx.message.reply_to_message) {
      await Promise.allSettled([
        ctx.deleteMessage(ctx.message.reply_to_message.message_id),
        ctx.deleteMessage(),
      ]);
    }
  } as CommandMiddleware,
);
