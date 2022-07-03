import {
  Context as TelegrafContext,
  NarrowedContext,
  Middleware as TMiddleware,
  Types,
} from "telegraf";
import { Update, User } from "typegram";
import { Ctx } from "./context";
import { ChatLanguageCode, DbChat } from "./models";

export type MaybePromise<T = any> = T | Promise<T>;

export type DbOptional<T> = T | null;

/** Utility for typing `bot.on('foo', fooMiddleware)` */
export type OnMiddleware<
  U extends Types.UpdateType | Types.MessageSubType,
  C extends TelegrafContext = Ctx,
> = TMiddleware<MatchedContext<C, U>>;

export type ActionMiddleware<C extends TelegrafContext = Ctx> = TMiddleware<
  MatchedContext<C & { match: RegExpExecArray }, "callback_query">
>;

export type CommandMiddleware<C extends TelegrafContext = Ctx> = TMiddleware<
  MatchedContext<C, "text">
>;

export type HearsMiddleware<C extends TelegrafContext = Ctx> = TMiddleware<
  MatchedContext<C & { match: RegExpExecArray }, "text">
>;

export type GuardPredicate<C extends TelegrafContext = Ctx> =
  | ((ctx: C) => boolean)
  | ((ctx: C) => Promise<boolean>);

export type MatchedContext<
  C extends TelegrafContext,
  T extends Types.UpdateType | Types.MessageSubType,
> = NarrowedContext<C, MountMap[T]>;

type MountMap = {
  [T in Types.UpdateType]: Extract<Update, Record<T, object>>;
} & {
  [T in Types.MessageSubType]: {
    message: Extract<Update.MessageUpdate["message"], Record<T, unknown>>;
    update_id: number;
  };
};

export type NonemptyReadonlyArray<T> = readonly [T, ...T[]];

export type LocaleContainer = Record<ChatLanguageCode, Record<string, string>>;

export type MentionableUser = Pick<
  User,
  "id" | "username" | "first_name" | "last_name"
>;

export type TranslateFn = (
  s: string,
  replaces?: Record<string, string | number>,
) => string;

type NonOptionalKeys<T> = {
  [K in keyof T]: {} extends { [P in K]: T[K] } ? never : K;
}[keyof T];

export type KeysWhichMapTo<T, U, O = Pick<T, NonOptionalKeys<T>>> = {
  [K in keyof O]: O[K] extends U ? K : never;
}[keyof O];

export type MatchedMiddleware<
  C extends Ctx,
  T extends Types.UpdateType | Types.MessageSubType =
    | "message"
    | "channel_post",
> = NonemptyReadonlyArray<
  TMiddleware<MatchedContext<C & { match: RegExpExecArray }, T>>
>;
