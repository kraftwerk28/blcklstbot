import { Chat, User } from 'typegram';

import { CaptchaMode } from './';
import { DbOptional } from './utils';

type LanguageCode = 'uk' | 'en';

export type DbChatFromTg = Pick<
  Chat.GroupChat & Chat.UserNameChat,
  'id' | 'title' | 'username'
>;

export type DbChat = DbChatFromTg & {
  captcha_modes: CaptchaMode[];
  captcha_timeout: number;
  /** Which language should bot user for that chat (WIP) */
  language_code: LanguageCode;
  /** Message with chat rules */
  rules_message_id: DbOptional<number>;
  delete_slash_commands: boolean;
  replace_code_with_pic: boolean;
};

export type DbUserFromTg = Pick<
  User,
  'id' | 'first_name' | 'last_name' | 'username' | 'language_code'
>;

export type DbUser = DbUserFromTg & {
  /** User already passed captcha in some chat */
  approved: boolean;
  warnings_count: number;
  banned: boolean;
  warn_ban_reason: DbOptional<string>;
};

export type DbUserMessage = {
  chat_id: number,
  user_id: number,
  message_id: number,
  timestamp: number
};
