import { log } from '../logger';
import { CommandMiddleware } from '../types';
import { getCodeFromMessage, runEnry, updloadToGist } from '../utils';

export const makeGist: CommandMiddleware = async function (ctx, next) {
  const reply = ctx.message.reply_to_message;
  if (!reply || !('text' in reply)) return next();

  const sourceCode = getCodeFromMessage(reply);
  if (!sourceCode) return next();
  const languageName = await runEnry(sourceCode);
  log.info('Uploading to gist `%s` code', languageName);
  const codeUrl = await updloadToGist(languageName, sourceCode);
  if (codeUrl) {
    return ctx.reply(codeUrl, { disable_web_page_preview: true });
  }
};
