import { log } from '../logger';
import { OnMiddleware } from '../types';

type Middleware = OnMiddleware<'new_chat_members' | 'chat_member'>;

export const botHasSufficientPermissions: Middleware =
  async function(ctx, next) {
    // TODO: cache chat member with some EXPIRE in redis
    const me = await ctx.getChatMember(ctx.botInfo.id);
    if (!me.can_delete_messages) {
      return log.warn(`Bot cannot delete messages in chat ${ctx.chat.id}`);
    }
    // FIXME: doesn't work for some reasons
    // if (!me.can_send_messages) {
    //   return log.warn(`Bot cannot send messages in chat ${ctx.chat.id}`);
    // }
    return next();
  };
