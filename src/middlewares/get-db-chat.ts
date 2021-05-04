import { Composer, Middleware } from 'telegraf';
import { Chat } from 'typegram';
import { Ctx, DbChat } from '../types';

type C = (Chat.GroupChat | Chat.SupergroupGetChat) & Chat.UserNameChat;

export const getDbChat: Middleware<Ctx> = Composer.chatType(
  ['group', 'supergroup'],
  async function(ctx, next) {
    const chat = ctx.chat as C;
    const type = chat.type;
    if (type !== 'supergroup' && type !== 'group') {
      return next();
    }
    const dbChat: Partial<DbChat> = {
      id: chat.id,
      title: chat.title,
    };
    if ('username' in chat) {
      dbChat.username = chat.username;
    }
    const inserted = await ctx.dbStore.addChat(dbChat);
    ctx.dbChat = inserted;
    return next();
  });
