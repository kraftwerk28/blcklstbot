import { CaptchaMode } from './types';

export const CHATS_TABLE_NAME = 'chats';
export const USERS_TABLE_NAME = 'users';
export const DYN_COMMANDS_TABLE_NAME = 'dynamic_commands';
/** NOTE: this must be ALL captcha modes to work properly in
 * chat settings flow
 */
export const DEFAULT_CAPCHA_MODES = Object.values(CaptchaMode);

export const MIN_CAPTCHA_TIMEOUT = 10;
export const MAX_CAPTCHA_TIMEOUT = 5 * 60;

/**
 * Timeout in seconds, after which messages, sent by bot
 * in reply to, e.g., admin commands,
 * will be deleted (for keeping chat clean from bot flooding).
 * Currently this value is used for `ctx.deleteItSoon()`
 */
export const BOT_SERVICE_MESSAGES_TIMEOUT = 120;

export const MAX_WARNINGS = 3;
export const KEEP_TRACKED_MESSAGES_TIMEOUT = 24 * 60 * 60;

export const GIST_UPLOAD_LINE_COUNT_THRESHOLD = 16;

export const MDN_URL = 'https://developer.mozilla.org';
export const CPPREFERENCE_URL = 'https://en.cppreference.com';

export const MAX_INLINE_RESULTS_AMOUNT = 50;

/**
 * Time in seconds, where captcha message text is updated,
 * e.g. update a seconds remaining to solve it etc.
 */
export const CAPTCHA_MESSAGE_UPDATE_INTERVAL = 10;
