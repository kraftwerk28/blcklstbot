import {
  Context as TelegrafContext,
  NarrowedContext,
  Middleware,
} from 'telegraf';
import { MessageSubType, UpdateType } from 'telegraf/typings/telegram-types';
import { Update } from 'typegram';
import { Ctx } from './context';

export type MaybePromise<T = any> = T | Promise<T>;

export type DbOptional<T> = T | undefined;

/** Utility for typing `bot.on('foo', fooMiddleware)` */
export type OnMiddleware<
  U extends UpdateType | MessageSubType,
  C extends TelegrafContext = Ctx
  > = Middleware<MatchedContext<C, U>>;

export type CommandMiddleware<C extends TelegrafContext = Ctx>
  = Middleware<MatchedContext<C, 'text'>>;

export type HearsMiddleware<C extends TelegrafContext = Ctx>
  = Middleware<MatchedContext<C & { match: RegExpExecArray }, 'text'>>;

export type MatchedContext<
  C extends TelegrafContext,
  T extends UpdateType | MessageSubType
  > = NarrowedContext<C, MountMap[T]>

type MountMap =
  { [T in UpdateType]: Extract<Update, Record<T, object>> } &
  {
    [T in MessageSubType]: {
      message: Extract<Update.MessageUpdate['message'], Record<T, unknown>>
      update_id: number
    }
  }
