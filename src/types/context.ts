import { Context as TelegrafContext } from 'telegraf';
import { Message } from 'typegram';

import { EventQueue } from '../event-queue';
import { DbStore } from '../db-store';
import { EventQueueEvent } from './event-queue';
import { DbChat } from './models';

export interface Ctx extends TelegrafContext {
  dbStore: DbStore;
  eventQueue: EventQueue<EventQueueEvent>;
  botCreatorId: number;
  dbChat: DbChat;
  /**
   * Delete message after some time
   * Usage: await ctx.reply(...).then(ctx.deleteItSoon);
   */
  deleteItSoon(): (message: Message) => Message;
  tryDeleteMsg(messageId?: number): Promise<true>;
}
