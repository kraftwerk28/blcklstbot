import { CaptchaMode } from './types';

export const CHATS_TABLE_NAME = 'chats';
export const USERS_TABLE_NAME = 'users';
export const BOT_MESSAGE_TIMEOUT = 60;

export const DEFAULT_CAPCHA_MODES: CaptchaMode[] = [
  'arithmetic',
  'matrix-denom',
];
