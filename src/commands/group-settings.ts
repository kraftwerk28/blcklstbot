import { Composer } from '../composer';
import { DEFAULT_CAPCHA_MODES } from '../constants';
import { bold, code } from '../utils/html';
import { CommandMiddleware } from '../types';
import { isGroupChat, senderIsAdmin } from '../guards';
import { deleteMessage } from '../middlewares';

function booleanEmoji(b: boolean) {
  // return b ? '\u2705' : '\u26d4';
  return b ? '\u2705' : '\u274c';
}

export const groupSettings = Composer.branchAll(
  [senderIsAdmin, isGroupChat],
  async function (ctx) {
    const rows = [];
    const dbChat = ctx.dbChat;
    rows.push(bold('Settings:'));
    rows.push('Captcha modes:');
    rows.push(
      ...DEFAULT_CAPCHA_MODES.map(
        mode =>
          `  ${booleanEmoji(dbChat.captcha_modes.includes(mode))} ${mode}`,
      ),
    );
    rows.push(
      'Delete "*user* joined/left the group": ' +
        booleanEmoji(dbChat.delete_joins),
    );
    rows.push(
      'Propagate reports to sibling chats: ' +
        booleanEmoji(dbChat.propagate_bans),
    );
    rows.push(
      'Upload huge code messages to GitHub Gist: ' +
        booleanEmoji(dbChat.upload_to_gist),
    );
    rows.push(
      `Delete ${code('/slash')} commands sent by non-admins: ` +
        booleanEmoji(dbChat.delete_slash_commands),
    );
    rows.push(`Preferred chat language (uk/en): ${bold(dbChat.language_code)}`);
    rows.push(`CAS ban enabled: ${booleanEmoji(dbChat.enable_cas)}`);
    rows.push(`Captcha timeout: ${dbChat.captcha_timeout}s.`);

    await ctx.deleteItSoon()(ctx.message);
    await ctx
      .replyWithHTML(rows.join('\n'), {
        reply_to_message_id: ctx.message.message_id,
      })
      .then(ctx.deleteItSoon());
  } as CommandMiddleware,
  deleteMessage,
);
