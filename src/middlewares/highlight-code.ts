import { OnMiddleware } from '../types';
import { code, escape } from '../utils/html';

export const highlightCode: OnMiddleware<'text'> = async function(ctx, next) {
  if (!ctx.dbChat.replace_code_with_pic || !ctx.message.entities) {
    return next();
  }
  const codeEntities = ctx.message.entities.filter(
    (e) => e.type === 'pre' || e.type === 'code',
  );
  if (codeEntities.length !== 1) {
    // TODO:  Need to merge multiple entities into one
    return next();
  }
  const { length, offset } = codeEntities[0];
  const codeSource = ctx.message.text.slice(offset, offset + length);
  await ctx.replyWithHTML(code(escape(codeSource)));
  return next();
};
