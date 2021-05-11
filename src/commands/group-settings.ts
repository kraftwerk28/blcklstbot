import { Composer } from '../composer';
import { DEFAULT_CAPCHA_MODES } from '../constants';
import { bold } from '../utils/html';
import { CommandMiddleware } from '../types';
import { isGroupChat, senderIsAdmin } from '../guards';
import { deleteMessage } from '../middlewares';

function booleanEmoji(b: boolean) {
  return b ? '\u2705' : '\u26d4';
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
        (mode) =>
          `  ${booleanEmoji(dbChat.captcha_modes.includes(mode))} ${mode}`,
      ),
    );
    rows.push(
      'Rules message: ' + booleanEmoji(dbChat.rules_message_id !== null),
    );
    // TODO:
    // rows.push(
    //   'Beautify code: ' + booleanEmoji(dbChat.replace_code_with_pic),
    // );
    rows.push(
      'Delete "*user* joined the group" messages: ' +
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

    await ctx.deleteItSoon()(ctx.message);
    rows.push(`Captcha timeout: ${dbChat.captcha_timeout}s.`);
    await ctx
      .replyWithHTML(rows.join('\n'), {
        reply_to_message_id: ctx.message.message_id,
      })
      .then(ctx.deleteItSoon());
  } as CommandMiddleware,
  deleteMessage,
);
