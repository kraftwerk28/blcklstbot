import { Composer } from "../composer.js";
import { messageIsReply } from "../guards/index.js";

const c = new Composer();

c.hears(/^!(\S+)$/)
  .chatType(["group", "supergroup"])
  .filter(messageIsReply)
  .use(async (ctx, next) => {
    const reply = ctx.message.reply_to_message;
    const [, command] = ctx.match;
    if (!command) {
      return next();
    }
    const dbCommand = await ctx.dbStore.getCommand(command, ctx.chat.id);
    if (dbCommand) {
      await ctx.api.copyMessage(
        ctx.chat.id,
        +process.env.COMMANDS_CHANNEL_ID!,
        dbCommand.message_id,
        { reply_to_message_id: reply.message_id ?? ctx.message.message_id },
      );
    } else {
      return next();
    }
  });

export default c;
