import { log } from '../logger';
import { OnMiddleware } from '../types';

const substRe = /s\/((?:\\\/|[^\/])+)\/((?:\\\/|[^\/])*)(?:\/([mig]*))?(?:$|\s+)/g;

export const substitute: OnMiddleware<'text'> = async function (ctx, next) {
  const reply = ctx.message.reply_to_message;
  if (!reply || !('text' in reply)) return next();
  let finalText = reply.text;
  for (const match of ctx.message.text.matchAll(substRe)) {
    const replaceTo = match[2]
      .replace(/\\([&\d])/g, '$$$1')
      .replace(/\$0/g, '$$&');
    try {
      // Catch bad regex syntax
      const replaceFrom = new RegExp(match[1], match[3]);
      finalText = finalText.replace(replaceFrom, replaceTo);
      log.info('Regex substitution: %O', { replaceFrom, replaceTo, finalText });
    } catch {}
  }
  const replyOptions = { reply_to_message_id: reply.message_id };
  return ctx.reply(finalText, replyOptions);
};
