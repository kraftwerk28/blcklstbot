import { Composer, Context, Middleware as TfMiddleware } from 'telegraf';
import { PgClient } from './pg';
import { VotebanCooldown } from './votebanCD';
import { BotCommand, Chat, Message, User } from 'typegram';
import { Api } from './api';
import { RedisClient } from './redis';
import { MessageSubType, UpdateType } from 'telegraf/typings/telegram-types';

type Union2Itx<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
type Deun<T extends object> = T & Partial<Union2Itx<T>>;

export function deunionize<T extends object>(t: T): Deun<T> {
  return t;
}

export type Middleware = TfMiddleware<Ctx>;

export type CommandHandler = Composer<Ctx>['command'] extends
  (cmd: string, fn: infer U,) => any ? U : never;

export type OnMiddleware<T extends UpdateType | MessageSubType> =
  Composer<Ctx>['on'] extends (type: T | T[], ...fns: (infer U)[]) => any
  ? U
  : never;

type MaybeArray<T> = T | T[];
type NonemptyRoArray<T> = readonly [T, ...T[]];
type A<T extends UpdateType | MessageSubType> =
  Composer<Ctx>['on'] extends (
    updateType: MaybeArray<T>,
    ...fns: NonemptyRoArray<infer U>
  ) => Composer<Ctx> ? U : never;

export type Banned = { chatId: number; userId: number; resultMsgId: number };

export interface Ctx extends Context {
  pg: PgClient;
  redis: RedisClient;
  api: Api;
  votebanCD: VotebanCooldown;
  votebans: Map<string, Report>;
  banned: Map<number, Banned>;
  commands: BotCommand[];
  adminUId: number
}

export interface BannedUser {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name: string;
  username: string;
  message: string;
  reason: string;
  date: string;
}

export type BanInfo = Omit<BannedUser, 'id' | 'date'>;

export interface Report {
  chat: Chat;
  reportedUser: User;
  reportedMsg?: Message;
  pollMsg: Message;
  reportMsg: Message;
}

// declare module 'telegraf' {
//   export interface Telegram {
//     sendPoll(
//       chatId: number,
//       question: string,
//       options: string[],
//       extra?: Partial<PollExtra>
//     ): Promise<Message>;
//     unbanChatMember(chatId: number, userId: number): Promise<boolean>;
//     getUpdates(
//       timeout?: number,
//       limit?: number,
//       offset?: number,
//       allowed_updates?: string[]
//     ): Promise<Update[]>;
//     setMyCommands(commands: Command[]): Promise<boolean>;
//   }

//   export interface ComposerConstructor {
//     drop<TContext extends ContextMessageUpdate>(
//       test: boolean | ((ctx: TContext) => Promise<boolean>)
//     ): Middleware<TelegrafContext>;
//     admin<TContext extends ContextMessageUpdate>(
//       ...middlewares: Middleware<TelegrafContext>[]
//     ): Middleware<TelegrafContext>;
//   }

//   export interface ContextMessageUpdate {
//     poll?: Poll;
//     pollAnswer?: PollAnswer;
//     votebanCD: VotebanCooldown;
//     replyTo(
//       text: string,
//       extra?: ExtraReplyMessage | undefined
//     ): Promise<Message | null>;
//     votebans: Map<string, Report>;
//     banned: Map<
//       number,
//       { chatId: number; userId: number; resultMsgId: number }
//     >;
//     cbQueryError(): Promise<boolean>;
//     deleteMessageWeak(
//       chatId: number | string,
//       messageId: number
//     ): Promise<boolean>;
//     db: typeof db;
//     api: API;
//     adminUID: number;
//     reportsChannelID: number;
//     reportsChannelUsername: string;
//     commands: Command[];
//   }

//   interface PollExtra {
//     is_anonymous: boolean;
//     type: PollType;
//     allows_multiple_answers: boolean;
//     correct_option_id: number;
//     is_closed: boolean;
//     disable_notification: boolean;
//     reply_to_message_id: number;
//     reply_markup: Markup;
//   }

//   type PollType = 'quiz' | 'regular';
//   type PollOption = { text: string; voter_count: number };

//   interface Poll {
//     id: string;
//     question: string;
//     options: PollOption[];
//     total_voter_count: number;
//     is_closed: boolean;
//     is_anonymous: boolean;
//     type: PollType;
//     allows_multiple_answers: boolean;
//   }

//   interface PollAnswer {
//     poll_id: string;
//     user: User;
//     option_ids: number[];
//   }

//   interface Command {
//     command: string;
//     description: string;
//   }
// }

