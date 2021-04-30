import { Context as TelegrafContext } from 'telegraf';
import { EventQueue } from '../event-queue';
import { DbStore } from '../db-store';
import { EventQueueEvent } from './event-queue';

export interface Ctx extends TelegrafContext {
  dbStore: DbStore;
  eventQueue: EventQueue<EventQueueEvent>;
}
