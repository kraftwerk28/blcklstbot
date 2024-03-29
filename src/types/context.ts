import { Context as TelegrafContext } from "telegraf";
import { Message } from "typegram";

import { EventQueue } from "../event-queue";
import { DbStore } from "../db-store";
import { EventQueueEvent } from "./event-queue";
import { DbChat, DbUser } from "./models";
import { LocaleContainer } from "./utils";

export interface Ctx extends TelegrafContext {
  dbStore: DbStore;
  eventQueue: EventQueue<EventQueueEvent>;
  botCreatorId: number;
  dbChat: DbChat;
  reportedUser: DbUser | undefined;
  /**
   * Delete message after some time
   * Usage: await ctx.reply(...).then(ctx.deleteItSoon);
   */
  deleteItSoon(): (message: Message) => Promise<Message>;
  tryDeleteMsg(messageId?: number): Promise<true>;
  locales: LocaleContainer;
  t(s: string, replaces?: Record<string, string | number>): string;
}
