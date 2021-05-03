import { CommandMiddleware } from '../types';

export const rules: CommandMiddleware = async function(ctx) {
  const reply = ctx.message.reply_to_message;
  if (ctx.message.text.match(/^\/rules(@\w+)?\s+del(ete)?$/)) {
    await ctx.dbStore.updateChatProp(ctx.chat.id, 'rules_message_id', null);
    await ctx.deleteMessage();
  } else if (reply) {
    await ctx.dbStore.updateChatProp(
      ctx.chat.id,
      'rules_message_id',
      reply.message_id,
    );
    await ctx.deleteMessage();
  } else if (typeof ctx.dbChat.rules_message_id === 'number') {
    await ctx.telegram.copyMessage(
      ctx.chat.id,
      ctx.chat.id,
      ctx.dbChat.rules_message_id,
      { reply_to_message_id: ctx.message.message_id },
    );
  } else {
    await ctx.deleteMessage();
  }
};
