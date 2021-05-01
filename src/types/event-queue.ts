import { Ctx } from './context';
import { MaybePromise } from './utils';

export type PongEvent = BaseEvent<'pong', {
  chatId: number,
  text?: string,
  time: number
  messageId: number,
}>;

export type CaptchaTimeoutEvent = BaseEvent<'captcha_timeout', {
  chatId: number,
  userId: number,
  captchaMessageId: number,
}>;

export type EventQueueEvent =
  | PongEvent
  | CaptchaTimeoutEvent;

export type BaseEvent<T extends string = any, P = unknown> = {
  type: T,
  payload: P,
};

export type ExtractType<E extends BaseEvent> = E['type'];

export type PayloadByType<E extends BaseEvent, T extends ExtractType<E>> =
  Extract<E, { type: T }>['payload'];

export type Context<
  Event extends BaseEvent,
  Type extends ExtractType<Event>
  > = Pick<Ctx, 'telegram' | 'dbStore'> & {
    type: Type,
    payload: PayloadByType<Event, Type>,
  };

export type Callback<E extends BaseEvent, T extends ExtractType<E>> = (
  ctx: Context<E, T>,
) => MaybePromise<void>;
