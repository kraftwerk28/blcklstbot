import { Composer } from "../composer.js";
import { messageIsReply, senderIsAdmin } from "../guards/index.js";

const composer = new Composer();

composer
  .command("del")
  .filter(messageIsReply)
  .use(senderIsAdmin)
  .use(async (ctx) => {
    await ctx.deleteMessage();
    await ctx.api.deleteMessage(
      ctx.chat.id,
      ctx.message.reply_to_message.message_id,
    );
  });

export default composer;
