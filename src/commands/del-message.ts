import { Composer } from "../composer.js";
import { messageIsReply, senderIsAdmin } from "../guards/index.js";

const composer = new Composer();

composer
  .command("del")
  .filter(messageIsReply)
  .filter(senderIsAdmin)
  .use(async (ctx) => {
    await ctx.deleteMessage().catch(ctx.log.error);
    await ctx.api
      .deleteMessage(ctx.chat.id, ctx.message.reply_to_message.message_id)
      .catch(ctx.log.error);
  });

export default composer;
