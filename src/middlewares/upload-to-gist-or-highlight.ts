import { Composer } from '../composer';
import { OnMiddleware } from '../types';
import { botHasSufficientPermissions, isGroupChat } from '../guards';
import { getCodeFromMessage, runEnry, updloadToGist } from '../utils';
import { log } from '../logger';
import { link, userMention } from '../utils/html';
import { GIST_UPLOAD_LINE_COUNT_THRESHOLD } from '../constants';

export const uploadToGistOrHighlight = Composer.guardAll(
  [isGroupChat, botHasSufficientPermissions],
  async function (ctx, next) {
    if (!ctx.dbChat.upload_to_gist) return next();
    const sourceCode = getCodeFromMessage(ctx.message);
    if (!sourceCode) return next();
    const lineCount = sourceCode.split('\n').length;
    if (lineCount < GIST_UPLOAD_LINE_COUNT_THRESHOLD) return next();
    const languageName = await runEnry(sourceCode);
    log.info('Uploading to gist a chunk of `%s` code', languageName);
    const codeUrl = await updloadToGist(languageName, sourceCode);
    if (!codeUrl) return next();
    await ctx.deleteMessage();
    const linkWithText = link(codeUrl, 'GitHub Gist');
    await ctx.replyWithHTML(
      `A chunk of code by ${userMention(ctx.from)} ` +
        `was moved to ${linkWithText}`,
      { disable_web_page_preview: true },
    );
    return next();
  } as OnMiddleware<'text'>,
);
