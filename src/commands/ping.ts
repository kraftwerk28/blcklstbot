import { Composer } from "../composer.js";

const composer = new Composer();

composer.on("message").command("ping", async (ctx, next) => {
  const argMatch = ctx.match.match(/^(\d+)(?:\s+(.+))?$/);
  if (!argMatch) return next();
  const [, secondsStr] = argMatch;
  const seconds = parseInt(secondsStr!);
  const payload = {
    chatId: ctx.chat.id,
    text: ctx.match[2],
    time: seconds,
    messageId: ctx.message.message_id,
  };
  await ctx.eventQueue.pushDelayed(seconds, "pong", payload);
});

export default composer;
