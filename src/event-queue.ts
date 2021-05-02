import { Redis } from 'ioredis';
import { Telegram } from 'telegraf';
import { DbStore } from './db-store';
import {
  BaseEvent,
  Callback,
  ExtractType,
  MaybePromise,
  PayloadByType,
} from './types';

export class EventQueue<Event extends BaseEvent> {
  private timerId: NodeJS.Timeout | null = null;
  private subscribers: Map<
    ExtractType<Event>,
    Callback<Event, ExtractType<Event>>[]
  > = new Map();
  private errorSubscribers: Set<(error: Error) => MaybePromise> = new Set();
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

  on<T extends ExtractType<Event>>(type: T, callback: Callback<Event, T>) {
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

  private async emit<T extends ExtractType<Event>>(
    type: T,
    payload: PayloadByType<Event, T>,
  ): Promise<void> {
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

  async pushDelayed<T extends ExtractType<Event>>(
    seconds: number,
    type: T,
    payload: Extract<Event, { type: T }>['payload'],
  ) {
    const deadline = Date.now() + seconds * 1000;
    await this.redisClient.zadd(
      this.sortedSetKey,
      deadline,
      JSON.stringify({ type, payload }),
    );
    return this;
  }
}
