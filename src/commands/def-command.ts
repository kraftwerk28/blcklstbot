import { Composer } from '../composer';
import { isGroupChat, senderIsAdmin } from '../guards';
import { HearsMiddleware } from '../types';
import { noop } from '../utils';

/** Registers message that will be responded to !<command> */
export const defMessage = Composer.optional(isGroupChat, async function (ctx) {
  const { chat, from, match, tg, message } = ctx;
  const commandsChannelId = +process.env.COMMANDS_CHANNEL_ID!;
  const reply = message.reply_to_message;
  const command = match[3];
  const isAdmin = await senderIsAdmin(ctx);
  const isUndef = match[1] === 'un';

  const existingCommand = await ctx.dbStore.getCommand(command, chat.id);
  if (isUndef) {
    if (!existingCommand) return;
    if (existingCommand.defined_by === from.id) {
      await tg
        .deleteMessage(commandsChannelId, existingCommand.message_id)
        .catch(noop);
      await ctx.dbStore.undefCommand(command, from.id);
      return;
    }
  } else {
    if (!reply) return;
    if (existingCommand) {
      await tg.deleteMessage(commandsChannelId, existingCommand.message_id);
      await ctx.dbStore.undefCommand(command, from.id);
    }
    const isGlobal = match[2] === 'global';
    if (isGlobal && !isAdmin) return;

    const forwardedMsg = await tg.forwardMessage(
      commandsChannelId,
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
  }
} as HearsMiddleware);
