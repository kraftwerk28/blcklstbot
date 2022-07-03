import { html } from '../utils';
import { Composer } from '../composer';
import {
  botHasSufficientPermissions,
  isGroupChat,
  senderIsAdmin,
} from '../guards';
import { CommandMiddleware } from '../types';

export const help = Composer.optional(
  Composer.allOf(isGroupChat, botHasSufficientPermissions),
  async function (ctx) {
    const isAdmin = await senderIsAdmin(ctx);
    let commandList = [
      '/help - show current help',
      '/ping <seconds> [text] - ping yourself after a time',
    ];
    if (isAdmin) {
      commandList.push(
        '/rules - set/show rules message for chat (must reply, admins only)',
        '/report [reason] - report user (admins only)',
        '/warn <reason> - warn user. The reason is required only first time (admins only)',
        '/settings - show chat settings',
        '/captcha_timeout <seconds> - set captcha timeout (must be between 10 seconds and 5 minutes)',
        '/captcha <type> [type]... - set captcha that will be randomly selected (pass "all" to select all types)',
        '/delete_joins <type> [type]... - delete messages "*user* joined the group"',
        '/propagate_reports - toggle report propagation, i.e. banned user will be banned in other chats also',
        '/replace_code - toggle automatic code uploading to GitHub Gist (admins only)',
      );
    }
    const links = [
      ['https://github.com/kraftwerk28/blcklstbot', 'Bot code'],
      [
        'https://github.com/kraftwerk28/tree-sitter-highlight-server',
        'Code highlighting server',
      ],
      [
        'https://github.com/kraftwerk28/enry-server',
        'Language detection server',
      ],
    ];
    const textRows = [
      html.bold('Commands:'),
      html.escape(commandList.join('\n')),
      '',
      'To make a text substitution, which is somewhat similar to ' +
        html.link('https://en.wikipedia.org/wiki/Sed', 'GNU/sed') +
        ', just reply to text message with a pattern(-s) to make proper substitution(-s)',
      '',
      html.bold('Links:'),
      ...links.map(([l, t]) => `• ${html.link(l, t)}`),
    ];
    await ctx.deleteItSoon()(ctx.message);
    return ctx
      .replyWithHTML(textRows.join('\n'), {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
      })
      .then(ctx.deleteItSoon());
  } as CommandMiddleware,
);
