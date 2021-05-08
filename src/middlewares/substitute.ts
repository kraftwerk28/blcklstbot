import { log } from '../logger';
import { OnMiddleware } from '../types';

export const substitute: OnMiddleware<'text'> = async function(ctx, next) {
  const reply = ctx.message.reply_to_message;
  if (!reply || !('text' in reply)) return next();
  const match = ctx.message.text.match(
    /^s\/((?:\\\/|[^\/])+)\/((?:\\\/|[^\/])*)(?:\/([igm]*))?$/,
  );
  if (!match) return next();
  let [, from, to, flags] = match;
  const fromRe = new RegExp(from, flags);
  to = to.replace(/\\([&\d])/g, '$$$1');
  log.info('Regex substitution: %O', { fromRe, to });
  const replyOptions = { reply_to_message_id: reply.message_id };
  const finalText = reply.text.replace(fromRe, to);
  await ctx.reply(finalText, replyOptions);
};
