import { OnMiddleware } from '../types';
import { code, escape } from '../utils/html';
import { getCodeFromMessage } from '../utils';

export const highlightCode: OnMiddleware<'text'> = async function(ctx, next) {
  if (!ctx.dbChat.replace_code_with_pic || !ctx.message.entities) {
    return next();
  }
  const sourceCode = getCodeFromMessage(ctx.message);
  if (!sourceCode) return next();
  await ctx.replyWithHTML(code(escape(sourceCode)));
  return next();
};
