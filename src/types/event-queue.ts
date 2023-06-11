import { Ctx } from "./context";
import { MaybePromise } from "./utils";

export type PongEvent = BaseEvent<
  "pong",
  {
    chatId: number;
    text?: string;
    time: number;
    messageId: number;
  }
>;

export type CaptchaTimeoutEvent = BaseEvent<
  "captcha_timeout",
  {
    chatId: number;
    userId: number;
    captchaMessageId: number;
    newChatMemberMessageId: number;
  }
>;

export type UnkickAfterCaptcha = BaseEvent<
  "unkick_after_captcha",
  {
    chat_id: number;
    user_id: number;
  }
>;

export type DeleteMessageEvent = BaseEvent<
  "delete_message",
  {
    chatId: number;
    messageId: number;
  }
>;

export type EventQueueEvent =
  | PongEvent
  | CaptchaTimeoutEvent
  | UnkickAfterCaptcha
  | DeleteMessageEvent;

export type BaseEvent<
  T extends string = any,
  P extends Record<string | number, any> = any,
  Pk = (keyof P)[],
> = {
  /** Event type */
  type: T;
  /** Event payload */
  payload: P;
  /** Keys used to hash this event for further ability
   * to remove then from queue
   */
  pkArray: Pk;
};

export type ExtractType<E extends BaseEvent> = E["type"];

export type PayloadByType<
  E extends BaseEvent,
  T extends ExtractType<E>,
> = Extract<E, { type: T }>["payload"];

export type EventPrimaryKeys<
  E extends BaseEvent,
  T extends ExtractType<E>,
> = Extract<E, { type: T }>["pkArray"];

export type Context<
  Event extends BaseEvent,
  Type extends ExtractType<Event>,
> = Pick<Ctx, "telegram" | "dbStore"> & {
  type: Type;
  payload: PayloadByType<Event, Type>;
};

export type Callback<E extends BaseEvent, T extends ExtractType<E>> = (
  ctx: Context<E, T>,
) => MaybePromise<void>;

export type IgnorePredicate<E extends BaseEvent, T extends ExtractType<E>> = (
  payload: PayloadByType<E, T>,
) => boolean;
