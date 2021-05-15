import { Composer } from '../composer';
import { botHasSufficientPermissions, senderIsAdmin } from '../guards';
import { log } from '../logger';
import { CommandMiddleware } from '../types';
import { noop, runEnry, uploadToGist } from '../utils';
import { link, userMention } from '../utils/html';

/** Manually upload text in replied message to Gist */
export const manualGist: CommandMiddleware = Composer.guardAll(
  [botHasSufficientPermissions, senderIsAdmin],
  async function (ctx, next) {
    const reply = ctx.message.reply_to_message;
    if (!reply || !reply.from || !('text' in reply)) return next();
    const sourceCode = reply.text;
    const enryResult = await runEnry(sourceCode);
    if (!enryResult) return next();
    log.info('Manual uploading to gist `%s` code', enryResult.language);
    const codeUrl = await uploadToGist(enryResult, sourceCode);
    if (codeUrl) {
      await ctx.deleteMessage(reply.message_id).catch(noop);
      const codeLink = link(codeUrl, 'GitHub Gist');
      const text =
        `${userMention(ctx.from)} uploaded ` +
        `${userMention(reply.from)}'s message to ${codeLink}`;
      return ctx.replyWithHTML(text, { disable_web_page_preview: true });
    }
  } as CommandMiddleware,
);
