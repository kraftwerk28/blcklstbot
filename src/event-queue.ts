import { Redis } from 'ioredis';
import { Telegram } from 'telegraf';
import { DbStore } from './db-store';
import { log } from './logger';
import {
  BaseEvent,
  Callback,
  ExtractType,
  IgnorePredicate,
  MaybePromise,
  PayloadByType,
} from './types';

export class EventQueue<
  Event extends BaseEvent,
  EventType extends ExtractType<Event> = ExtractType<Event>,
  > {
  private timerId: NodeJS.Timeout | null = null;
  private subscribers: Map<EventType, Callback<Event, EventType>[]> = new Map();
  private errorSubscribers: Set<(error: Error) => MaybePromise> = new Set();
  private ignoredEvents: Set<{
    type: EventType,
    predicate: IgnorePredicate<Event, EventType>
  }> = new Set;
  private redisClient: Redis;

  constructor(
    private readonly telegram: Telegram,
    private readonly dbStore: DbStore,
    private readonly sortedSetKey = 'evt_queue:zset',
    private pollTimeout = 500,
  ) {
    this.pollEvents = this.pollEvents.bind(this);
    this.setPollTimeout(this.pollTimeout);
    this.redisClient = dbStore.redisClient;
    this.pollTimeout = pollTimeout;
  }

  setPollTimeout(timeout: number) {
    this.pollTimeout = timeout;
    if (typeof this.timerId === 'number') {
      clearInterval(this.timerId);
    }
    this.timerId = setInterval(this.pollEvents, timeout);
  }

  dispose() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
    }
  }

  on<T extends EventType>(type: T, callback: Callback<Event, T>) {
    const existingList = this.subscribers.get(type);
    if (existingList) {
      this.subscribers.set(type, existingList.concat(callback));
    } else {
      this.subscribers.set(type, [callback]);
    }
    return this;
  }

  onError(callback: (error: Error) => MaybePromise) {
    this.errorSubscribers.add(callback);
    return this;
  }

  private async emit<T extends EventType>(
    type: T,
    payload: PayloadByType<Event, T>,
  ): Promise<void> {
    for (const ignoreDescriptor of this.ignoredEvents) {
      if (
        ignoreDescriptor.type === type &&
        ignoreDescriptor.predicate(payload)
      ) {
        this.ignoredEvents.delete(ignoreDescriptor);
        return;
      }
    }
    const callbacks = this.subscribers.get(type);
    const promises: Promise<void>[] = [];
    const baseContext = { telegram: this.telegram, dbStore: this.dbStore };
    if (callbacks) {
      const data = Object.assign({ type, payload }, baseContext);
      for (const callback of callbacks) {
        const maybePromise = callback(data);
        if (maybePromise instanceof Promise) {
          promises.push(maybePromise);
        }
      }
    }
    for (const sett of await Promise.allSettled(promises)) {
      if (sett.status === 'rejected') {
        for (const callback of this.errorSubscribers) {
          callback(sett.reason as Error);
        }
      }
    }
  }

  private async pollEvents() {
    const now = Date.now();
    const events = await this.redisClient.zrangebyscore(
      this.sortedSetKey,
      0,
      now,
    );
    await this.redisClient.zremrangebyscore(this.sortedSetKey, 0, now);
    for (const event of events) {
      try {
        const { type, payload } = JSON.parse(event);
        this.emit(type, payload);
      } catch (err) { }
    }
  }

  async pushDelayed<T extends EventType>(
    seconds: number,
    type: T,
    payload: Extract<Event, { type: T }>['payload'],
    hash?: string,
  ) {
    const deadline = Date.now() + seconds * 1000;
    const rawPayload = JSON.stringify({ type, payload });
    await this.redisClient.zadd(
      this.sortedSetKey,
      deadline,
      rawPayload,
    );
    hash ??= rawPayload;
    await this.redisClient.set(hash, deadline);
    await this.redisClient.expire(hash, seconds);
    return this;
  }

  // TODO: If server restarts between registering ignored event
  // and emitting it from queue, the event won't be ignored
  // The solution is to store ignored metadata in other redis set
  // OR even completely removing it from the set, but this requires
  // iterating over all zset elements
  ignoreNextEvent<T extends EventType>(
    type: T,
    predicate: IgnorePredicate<Event, T>
  ) {
    this.ignoredEvents.add({ type, predicate });
  }

  async removeEvent<T extends EventType>(hash: string):
    Promise<PayloadByType<Event, T> | null> {
    const score = await this.redisClient.get(hash);
    if (score) {
      const rawPayload = await this.redisClient.zrangebyscore(
        this.sortedSetKey,
        score,
        score,
      );
      const { payload } = JSON.parse(rawPayload[0]);
      log.info(payload);
      await this.redisClient.zremrangebyscore(this.sortedSetKey, score, score);
      await this.redisClient.del(hash);
      return payload;
    }
    return null;
  }
}
