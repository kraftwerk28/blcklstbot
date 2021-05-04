import { Composer } from 'telegraf';
import { BOT_MESSAGE_TIMEOUT, DEFAULT_CAPCHA_MODES } from '../constants';
import { bold } from '../utils/html';
import { CommandMiddleware } from '../types';
import { isGroupChat, senderIsAdmin } from '../guards';
import { all } from '../utils';

export const groupSettings: CommandMiddleware = Composer.optional(
  all(senderIsAdmin, isGroupChat),
  async function(ctx) {
    const rows = [bold('Settings:')];
    rows.push('Captcha modes:');
    rows.push(
      ...DEFAULT_CAPCHA_MODES.map((mode) =>
        ctx.dbChat.captcha_modes.includes(mode)
          ? '  \u2705 ' + mode
          : '  \u26d4 ' + mode,
      ),
    );
    rows.push(
      'Rules message: ' +
      (ctx.dbChat.rules_message_id === null ? '\u26d4' : '\u2705'),
    );
    rows.push(`Captcha timeout: ${ctx.dbChat.captcha_timeout}s.`);
    const sent = await ctx.replyWithHTML(rows.join('\n'), {
      reply_to_message_id: ctx.message.message_id,
    });
    ctx.eventQueue.pushDelayed(BOT_MESSAGE_TIMEOUT, 'delete_message', {
      chatId: ctx.chat.id,
      messageId: sent.message_id,
    });
  } as CommandMiddleware,
);
