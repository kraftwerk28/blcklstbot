import { Composer } from "../composer.js";
import { parse } from "../duration.js";

const composer = new Composer();

composer.on("message").command("ping", async (ctx, next) => {
  const argMatch = ctx.match.match(/^(\S+)(?:\s+(.+))?$/);
  if (!argMatch) return next();
  const [, durationStr = "", remindMessage] = argMatch;
  let durationSeconds: number;
  try {
    durationSeconds = parse(durationStr);
  } catch {
    return;
  }
  const payload = {
    chatId: ctx.chat.id,
    text: remindMessage,
    time: durationSeconds,
    messageId: ctx.message.message_id,
  };
  await ctx.eventQueue.pushDelayed(durationSeconds, "pong", payload);
});

export default composer;
