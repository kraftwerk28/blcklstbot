import { HearsMiddleware } from '../types';
import { noop } from '../utils';

export const bangHandler = async function (ctx, next) {
  const { chat, match, message, tg } = ctx;
  const reply = message.reply_to_message;
  const channelId = +process.env.COMMANDS_CHANNEL_ID!;
  const dbCommand = await ctx.dbStore.getCommand(match[1], chat.id);
  if (!dbCommand) return next();
  await tg
    .copyMessage(chat.id, channelId, dbCommand.message_id, {
      reply_to_message_id: reply?.message_id ?? message.message_id,
    })
    .catch(noop);
} as HearsMiddleware;
