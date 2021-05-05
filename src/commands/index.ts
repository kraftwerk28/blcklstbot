import { BotCommand } from 'typegram';

export * from './ping';
export * from './rules';
export * from './group-settings';
export * from './captcha';
export * from './help';
export * from './captcha-timeout';
export * from './beautify-code';
export * from './del-message';
export * from './report';

export const publicCommands: BotCommand[] = [
  { command: 'ping', description: 'Ping myself after n seconds' },
  { command: 'help', description: 'Get help (chat admins or PM only)' },
];
