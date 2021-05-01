import { Chat, User } from 'typegram';
import { DbOptional } from './utils';

type LanguageCode = 'uk' | 'en';

export type DbChat =
  Pick<Chat.GroupChat & Chat.UserNameChat, 'id' | 'title' | 'username'> &
  {
    /** Bitmask of `CatchaMode` */
    catcha_modes: number,
    captcha_timeout: number,
    /** Which language should bot user for that chat (WIP) */
    language_code: LanguageCode,
    /** Message with chat rules */
    rules_message_id: DbOptional<number>,
  };

export type DbUser = Pick<
  User,
  'id' | 'first_name' | 'last_name' | 'username' | 'language_code'
> & {
  /** User already passed captcha in some chat */
  approved: boolean,
  warnings_count: number,
  banned: boolean,
  banned_reason: DbOptional<string>,
};
