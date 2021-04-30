import { Chat, User } from 'typegram';
import { DbOptional } from './utils';

export type CaptchaMode = 'arighmetic' | 'choose-single-button';
type LanguageCode = 'uk' | 'en';

export type DbChat =
  Pick<Chat.GroupChat & Chat.UserNameChat, 'id' | 'title' | 'username'> &
  {
    catcha_modes: CaptchaMode[],
    captcha_timeout: number,
    language_code: LanguageCode,
    rules_message_id: DbOptional<number>,
  };

export type DbUser = Pick<
  User,
  'id' | 'first_name' | 'last_name' | 'username'
> & {
  banned: boolean,
  banned_reason: DbOptional<string>,
};
