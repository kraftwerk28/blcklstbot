import { Redis } from 'ioredis';
import { Telegram } from 'telegraf';
import { BaseEvent, Callback, ExtractType, PayloadByType } from './types';

export class EventQueue<Event extends BaseEvent> {
  private timerId: NodeJS.Timeout | null = null;
  private subscribers: Map<
    string,
    Callback<Event, ExtractType<Event>>[]
  > = new Map();

  constructor(
    private redisClient: Redis,
    private telegram: Telegram,
    private sortedSetKey = 'evt_queue:zset',
    private pollTimeout = 500,
  ) {
    const callback = this.pollEvents.bind(this);
    this.timerId = setInterval(callback, this.pollTimeout);
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
  }

  private emit<T extends ExtractType<Event>>(
    type: T,
    payload: PayloadByType<Event, T>,
  ) {
    const callbacks = this.subscribers.get(type);
    if (callbacks) {
      for (const callback of callbacks) {
        callback({ type, payload, telegram: this.telegram });
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

  pushDelayed<T extends ExtractType<Event>>(
    seconds: number,
    type: T,
    payload: Extract<Event, { type: T }>['payload'],
  ) {
    const deadline = Date.now() + seconds * 1000;
    return this.redisClient.zadd(
      this.sortedSetKey,
      deadline,
      JSON.stringify({ type, payload }),
    );
  }
}
