import { Composer } from "../composer";
import { isGroupChat } from "../guards";
import { HearsMiddleware } from "../types";

export const bangHandler = Composer.guardAll([isGroupChat], async function (
  ctx,
  next,
) {
  const reply = ctx.message.reply_to_message;
  const command = await ctx.dbStore.getCommand(ctx.match[1]!, ctx.chat.id);
  if (command) {
    await ctx.tg.copyMessage(
      ctx.chat.id,
      +process.env.COMMANDS_CHANNEL_ID!,
      command.message_id,
      { reply_to_message_id: reply?.message_id ?? ctx.message.message_id },
    );
  } else {
    return next();
  }
} as HearsMiddleware);
