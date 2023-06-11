import { Composer } from "../composer";
import { DYN_COMMANDS_TABLE_NAME } from "../constants";
import { isGroupChat, senderIsAdmin } from "../guards";
import { log } from "../logger";
import { DbDynamicCommand, HearsMiddleware } from "../types";

/** Registers message that will be responded to !<command> */
export const defMessage = Composer.guardAll(
  [isGroupChat, senderIsAdmin],
  async function (ctx) {
    const { chat, from, match, tg, message } = ctx;
    const cmdChannelId = +process.env.COMMANDS_CHANNEL_ID!;
    const reply = message.reply_to_message;
    const command = match[3];
    const isUndef = match[1] === "un";
    const isGlobal = match[2] === "global";

    const oldCommand = await ctx.dbStore
      .knex(DYN_COMMANDS_TABLE_NAME)
      .where("command", command)
      .andWhere("chat_id", "=", chat.id)
      .first<DbDynamicCommand | undefined>();

    if (oldCommand) {
      const deletedCommand = await ctx.dbStore
        .knex<DbDynamicCommand[]>(DYN_COMMANDS_TABLE_NAME)
        .where("message_id", "=", oldCommand.message_id)
        .andWhere("chat_id", "=", oldCommand.chat_id)
        .andWhere("global", "=", isGlobal)
        .delete()
        .returning("*")
        .then((rows) => rows[0]);

      if (deletedCommand) {
        await tg
          .deleteMessage(cmdChannelId, oldCommand.message_id)
          .catch((err) => log.error(err, "Failed to delete the old message"));
      }

      if (isUndef) {
        log.info({ command: deletedCommand }, "Deleted the command");
        // Deleted the command, now we're done
        return;
      }
    }

    if (!reply) return;

    const forwardedMsg = await tg.forwardMessage(
      cmdChannelId,
      chat.id,
      reply.message_id,
    );

    const newCommand = await ctx.dbStore
      .knex<DbDynamicCommand>(DYN_COMMANDS_TABLE_NAME)
      .insert({
        message_id: forwardedMsg.message_id,
        chat_id: chat.id,
        command,
        global: isGlobal,
        defined_by: from.id,
      })
      .returning("*")
      .then((rows) => rows[0]);
    log.info({ command: newCommand }, "Defined a new command");
  } as HearsMiddleware,
);
