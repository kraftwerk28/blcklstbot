// import { Context as TelegrafContext } from "telegraf";
import { Chat, Message } from "grammy/types";
import { ChatTypeContext, Context as GrammyContext } from "grammy";

import { EventQueue } from "../event-queue.js";
import { DbStore } from "../db-store.js";
import { EventQueueEvent } from "./event-queue.js";
import { DbChat, DbUser } from "./models.js";
import { LocaleContainer } from "./utils.js";
import { Logger } from "pino";

export interface Context extends GrammyContext {
  dbChat: this["chat"] extends Chat.SupergroupChat | Chat.GroupChat
    ? DbChat
    : DbChat | undefined;
  dbUser: this["chat"] extends Chat.SupergroupChat | Chat.GroupChat
    ? DbUser
    : DbUser | undefined;
  dbStore: DbStore;
  eventQueue: EventQueue<EventQueueEvent>;
  botCreatorId: number;
  reportedUser?: DbUser;
  /**
   * Delete message after some time
   * Usage: await ctx.reply(...).then(ctx.deleteItSoon);
   */
  deleteItSoon(): (message: Message) => Promise<Message>;
  tryDeleteMsg(messageId?: number): Promise<true>;
  locales: LocaleContainer;
  t(s: string, replaces?: Record<string, string | number>): string;
  log: Logger;
  commandArgs: string[];
}

export type GroupChatContext = ChatTypeContext<Context, "group" | "supergroup">;
