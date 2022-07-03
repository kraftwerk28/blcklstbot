import { Chat, User } from 'typegram';
import { CaptchaMode } from './';
import { DbOptional } from './utils';

export type ChatLanguageCode = 'uk' | 'en';

export type DbChatFromTg = Pick<
  Chat.GroupChat & Chat.UserNameChat,
  'id' | 'title' | 'username'
>;

export type DbUserFromTg = Pick<
  User,
  'id' | 'first_name' | 'last_name' | 'username' | 'language_code'
>;

export type DbChat = DbChatFromTg & {
  captcha_modes: CaptchaMode[];
  captcha_timeout: number;
  /** Which language should bot user for that chat (WIP) */
  language_code: ChatLanguageCode;
  /** Message with chat rules */
  rules_message_id: DbOptional<number>;
  delete_slash_commands: boolean;
  replace_code_with_pic: boolean;
  /** Delete "*User* joined" messages */
  delete_joins: boolean;
  propagate_bans: boolean;
  upload_to_gist: boolean;
};

/** Non-normalized version of User with primary key of (id, chat_id) */
export type DbUser = DbUserFromTg & {
  chat_id: number;
  /** User already passed captcha in some chat */
  approved: boolean;
  warnings_count: number;
  banned: boolean;
  warn_ban_reason: DbOptional<string>;
  banned_timestamp: DbOptional<Date>;
};

export type DbUserMessage = {
  chat_id: number;
  user_id: number;
  message_id: number;
  timestamp: Date;
};

export type EnryResponse = {
  language: string,
  extension: string,
  commentstring: string,
};

export type DbDynamicCommand = {
  /** ID of message in special channel where command messages are forwarded */
  message_id: number,
  chat_id: DbOptional<number>,
  command: string,
  defined_by: number,
  global: boolean,
};
