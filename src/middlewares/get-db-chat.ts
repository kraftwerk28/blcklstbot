import { Composer, Middleware } from 'telegraf';
import { Chat } from 'typegram';
import { Ctx } from '../types';

type C = (Chat.GroupChat | Chat.SupergroupChat) & Chat.UserNameChat;

export const getDbChat: Middleware<Ctx> = Composer.chatType(
  ['group', 'supergroup'],
  async function (ctx, next) {
    const chat = ctx.chat as C;
    if (!chat) return next();
    const inserted = await ctx.dbStore.addChat({
      id: chat.id,
      title: chat.title,
      username: chat.username,
    });
    ctx.dbChat = inserted;
    return next();
  },
);
