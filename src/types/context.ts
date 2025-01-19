import type { Chat, ChatMember, Message, User } from "grammy/types";
import type { ChatTypeContext, Filter, Context as GrammyContext } from "grammy";

import type { EventQueue } from "../event-queue.js";
import type { DbStore } from "../db-store.js";
import type { EventQueueEvent } from "./event-queue.js";
import type { DbChat, DbUser } from "./models.js";
import type { LocaleContainer, TranslateFn } from "./utils.js";
import type { Logger } from "pino";

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
  t: TranslateFn;
  log: Logger;
  commandArgs: string[];
  userCaptcha(user: User): Promise<void>;
  banUser(
    this: ChatTypeContext<Context, "group" | "supergroup">,
    reporterUser: Pick<User, "id" | "first_name">,
    reportedUser?: User,
    reason?: string,
  ): Promise<void>;
  _chatMemberCache: Record<number, ChatMember>;
  getChatMemberCached(this: Context, userId: number): Promise<ChatMember>;
  _lastUserMessages: Record<number, { chat_id: number; message_id: number }>;
}

export type GroupChatContext = ChatTypeContext<Context, "group" | "supergroup">;
