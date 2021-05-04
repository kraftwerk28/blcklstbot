import { Composer } from 'telegraf';
import { senderIsAdmin } from '../guards';
import { CommandMiddleware } from '../types';

export const help = Composer.optional(senderIsAdmin, async function(ctx) {
  return ctx
    .reply('Sample help', {
      reply_to_message_id: ctx.message.message_id,
    })
    .then(ctx.deleteItSoon());
} as CommandMiddleware);
