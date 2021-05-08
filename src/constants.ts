import { CaptchaMode } from './types';

export const CHATS_TABLE_NAME = 'chats';
export const USERS_TABLE_NAME = 'users';
export const DEFAULT_CAPCHA_MODES: CaptchaMode[] = Object.values(CaptchaMode);

export const MIN_CAPTCHA_TIMEOUT = 10;
export const MAX_CAPTCHA_TIMEOUT = 5 * 60;

/**
 * Timeout in seconds, after which messages, sent by bot
 * in reply to, e.g., admin commands,
 * will be deleted (for keeping chat clean from bot flooding).
 * Currently this value is used for `ctx.deleteItSoon()`
 */
export const BOT_SERVICE_MESSAGES_TIMEOUT = 30;

export const MAX_WARNINGS = 3;
export const KEEP_TRACKED_MESSAGES_TIMEOUT = 24 * 60 * 60;
