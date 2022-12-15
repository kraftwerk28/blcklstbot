import {
  Context as TelegrafContext,
  NarrowedContext,
  Middleware as TMiddleware,
  Types,
} from "telegraf";
import { Update, User } from "typegram";
import { Ctx } from "./context";
import { ChatLanguageCode } from "./models";

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
