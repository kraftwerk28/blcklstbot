import { Composer } from '../composer';
import { DEFAULT_CAPCHA_MODES } from '../constants';
import { bold } from '../utils/html';
import { CommandMiddleware } from '../types';
import { isGroupChat, senderIsAdmin } from '../guards';

function booleanEmoji(b: boolean) {
  return b ? '\u2705' : '\u26d4';
}

export const groupSettings: CommandMiddleware = Composer.guardAll(
  [senderIsAdmin, isGroupChat],
  async function(ctx) {
    const rows = [];
    rows.push(bold('Settings:'));
    rows.push('Captcha modes:');
    rows.push(
      ...DEFAULT_CAPCHA_MODES.map(
        (mode) =>
          '  ' +
          booleanEmoji(ctx.dbChat.captcha_modes.includes(mode)) +
          ' ' +
          mode,
      ),
    );
    rows.push(
      'Rules message: ' + booleanEmoji(ctx.dbChat.rules_message_id !== null),
    );
    rows.push(
      'Beautify code: ' + booleanEmoji(ctx.dbChat.replace_code_with_pic),
    );
    rows.push(`Captcha timeout: ${ctx.dbChat.captcha_timeout}s.`);
    await ctx
      .replyWithHTML(rows.join('\n'), {
        reply_to_message_id: ctx.message.message_id,
      })
      .then(ctx.deleteItSoon());
  } as CommandMiddleware,
);
