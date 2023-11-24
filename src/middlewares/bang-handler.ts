import { Composer } from "../composer.js";

const c = new Composer();

export default c;

c.chatType(["group", "supergroup"])
  .hears(/^!(\S+)$/)
  .use(async (ctx, next) => {
    const [, command] = ctx.match;
    ctx.log.info({ command });
    if (!command) {
      return next();
    }
    const dbCommand = await ctx.dbStore.getCommand(command, ctx.chat.id);
    if (dbCommand) {
      await ctx.api.copyMessage(
        ctx.chat.id,
        +process.env.COMMANDS_CHANNEL_ID!,
        dbCommand.message_id,
        {
          reply_to_message_id:
            ctx.message.reply_to_message?.message_id ?? ctx.message.message_id,
        },
      );
    } else {
      return next();
    }
  });
