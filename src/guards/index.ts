import { log } from '../logger';
import { GuardPredicate } from '../types';

export const botHasSufficientPermissions: GuardPredicate =
  async function(ctx) {
    // TODO: cache chat member with some EXPIRE in redis
    const me = await ctx.getChatMember(ctx.botInfo.id);
    if (!me.can_delete_messages) {
      log.warn(`Bot cannot delete messages in chat ${ctx.chat!.id}`);
      return false;
    }
    // FIXME: doesn't work for some reasons
    // if (!me.can_send_messages) {
    //   return log.warn(`Bot cannot send messages in chat ${ctx.chat.id}`);
    // }
    return true;
  };

export const senderIsAdmin: GuardPredicate = async function(ctx) {
  if (ctx.from!.id === ctx.botCreatorId) {
    // XD
    return true;
  }
  const cm = await ctx.getChatMember(ctx.from!.id);
  if (cm.status === 'administrator' || cm.status === 'creator') {
    return true;
  }
  return false;
};

export const isGroupChat: GuardPredicate = function(ctx) {
  return ctx.chat!.type === 'group' || ctx.chat!.type === 'supergroup';
}
