import { Composer } from "../composer";
import { isGroupChat, senderIsAdmin } from "../guards";
import { HearsMiddleware } from "../types";

/** Registers message that will be responded to !<command> */
export const defMessage = Composer.guardAll([isGroupChat], async function (
  ctx,
) {
  const { chat, from, match, tg, message } = ctx;
  const cmdChannelId = +process.env.COMMANDS_CHANNEL_ID!;
  const reply = message.reply_to_message;
  const command = match[3];
  const isAdmin = await senderIsAdmin(ctx);
  const isUndef = match[1] === "un";
  if (isUndef) {
    const dbCommand = await ctx.dbStore.getCommand(command, chat.id);
    if (!dbCommand) return;
    await tg.deleteMessage(cmdChannelId, dbCommand.message_id);
    await ctx.dbStore.undefCommand(command, from.id);
    return;
  }

  const isGlobal = match[2] === "global";
  if ((isGlobal && !isAdmin) || !reply) return;

  const forwardedMsg = await tg.forwardMessage(
    +process.env.COMMANDS_CHANNEL_ID!,
    chat.id,
    reply.message_id,
  );

  await ctx.dbStore.defineCommand(
    command,
    chat.id,
    from.id,
    forwardedMsg.message_id,
    isGlobal,
  );
} as HearsMiddleware);
