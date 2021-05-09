import { bold, escape, link } from '../utils/html';
import { Composer } from '../composer';
import { senderIsAdmin } from '../guards';
import { CommandMiddleware } from '../types';
import { deleteMessage } from '../middlewares';

export const help = Composer.branchAll(
  [senderIsAdmin],
  async function (ctx) {
    const commandList = [
      '/help - show current help',
      '/report [reason] - report user (admins only)',
      '/warn <reason> - warn user. The reason is required only first time (admins only)',
      '/rules - set rules message for chat (must reply, admins only)',
      '/ping <seconds> [text] - ping yourself after a time',
      '/settings - show chat settings',
      '/captcha_timeout <seconds> - set captcha timeout (admins only, must be between 10 seconds and 5 minutes)',
      '/captcha <type> [type]... - set captcha that will be randomly selected (admins only, pass "all" to select all types)',
      '/delete_joins <type> [type]... - delete messages "*user* joined the group"',
      '/propagate_reports - toggle report propagation, i.e. banned user will be banned in other chats also',
      // '/codepic <language> - highlight code with image (must be reply to message w/ code',
    ];
    const text = [
      bold('Commands:'),
      escape(commandList.join('\n')),
      bold('Links:'),
      link('https://github.com/kraftwerk28/blcklstbot', 'Bot code'),
      link(
        'https://github.com/kraftwerk28/tree-sitter-highlight-server',
        'Code highlighting server',
      ),
    ].join('\n');
    await ctx.deleteItSoon()(ctx.message);
    return ctx
      .replyWithHTML(text, {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
      })
      .then(ctx.deleteItSoon());
  } as CommandMiddleware,
  deleteMessage,
);
