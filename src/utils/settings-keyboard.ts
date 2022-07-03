import { InlineKeyboardMarkup } from 'typegram';
import { Markup } from 'telegraf';

import { CaptchaMode, DbChat } from '../types';
import { secondsToHumanReadable } from './';
import { LANGUAGE_FLAG } from '../constants';

const booleanEmoji = (b: boolean) => (b ? '\u2705' : '\u{1f6ab}');
const boolBullet = (b: boolean) => (b ? '\u{1f7e2}' : '\u26ab');

const boolButton = (chat: DbChat, prop: keyof DbChat, label: string) =>
  Markup.button.callback(
    `${booleanEmoji(chat[prop] as boolean)} ${label}`,
    `setting:${prop}`,
  );

export function settingsKeyboard(chat: DbChat): InlineKeyboardMarkup {
  const btn = Markup.button.callback;
  const { reply_markup } = Markup.inlineKeyboard([
    [
      btn(
        boolBullet(chat.captcha_modes.includes(CaptchaMode.Arithmetic)) +
          ` ${CaptchaMode.Arithmetic}`,
        `setting:${CaptchaMode.Arithmetic}`,
      ),
      btn(
        boolBullet(chat.captcha_modes.includes(CaptchaMode.Matrix)) +
          ` ${CaptchaMode.Matrix}`,
        `setting:${CaptchaMode.Matrix}`,
      ),
    ],
    [boolButton(chat, 'delete_joins', 'Delete "*user* joined/left the group"')],
    [
      boolButton(
        chat,
        'delete_slash_commands',
        'Delete slash commands from non-admins',
      ),
    ],
    [boolButton(chat, 'enable_cas', 'Enable CAS check')],
    [
      boolButton(
        chat,
        'propagate_bans',
        'Propagate ban to sibling chats (aka global ban)',
      ),
    ],
    [
      boolButton(
        chat,
        'upload_to_gist',
        'Upload huge code messages to GitHub Gist',
      ),
    ],
    [
      btn('\u{1f53d}', 'setting:dec_timeout'),
      btn(secondsToHumanReadable(chat.captcha_timeout), 'setting:nothing'),
      btn('\u{1f53c}', 'setting:inc_timeout'),
    ],
    [
      btn(
        LANGUAGE_FLAG[chat.language_code] + chat.language_code,
        'setting:change_language',
      ),
      btn('\u274c Close settings', 'setting:close'),
    ],
  ]);
  return reply_markup;
}
