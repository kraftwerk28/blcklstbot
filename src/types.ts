import { Telegram } from 'telegraf';

export type MaybePromise<T = any> = T | Promise<T>;

export type BaseEvent<T extends string = any, P = unknown> = {
  type: T;
  payload: P;
};

export type ExtractType<E extends BaseEvent> = E['type'];
export type PayloadByType<
  E extends BaseEvent,
  T extends ExtractType<E>
> = Extract<E, { type: T }>['payload'];

export type Context<
  Event extends BaseEvent,
  Type extends ExtractType<Event>
> = {
  telegram: Telegram;
  type: Type;
  payload: PayloadByType<Event, Type>;
};

export type Callback<E extends BaseEvent, T extends ExtractType<E>> = (
  ctx: Context<E, T>,
) => MaybePromise;
