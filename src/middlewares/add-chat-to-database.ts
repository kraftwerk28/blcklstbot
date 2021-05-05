import { Composer } from '../composer';
import { Chat } from 'typegram';
import { code } from '../utils/html';
import { DbChat, OnMiddleware } from '../types';
import { isGroupChat } from '../guards';

type Middleware = OnMiddleware<'message'>;

export const addChatToDatabase: Middleware = Composer.optional(
  isGroupChat,
  async function(ctx, next) {
    const chat = ctx.chat as Chat.GroupChat & Chat.UserNameChat;
    const dbChat: Partial<DbChat> = {
      id: chat.id,
      title: chat.title,
    };
    if ('username' in chat) {
      dbChat.username = chat.username;
    }
    const inserted = await ctx.dbStore.addChat(dbChat);
    if (inserted) {
      await ctx.telegram.sendMessage(
        ctx.botCreatorId,
        `New chat: ${chat.title} (${code(chat.id)})`,
      );
    }
    return next();
  }
);
