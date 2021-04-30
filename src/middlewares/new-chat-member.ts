import { runDangling } from '../utils';
import { Ctx, OnMiddleware } from '../types';
type Middleware = OnMiddleware<Ctx, 'new_chat_members' | 'chat_member'>;

async function userCaptcha(ctx: Ctx, userId: number) {
}

export const onNewChatMember: Middleware = async function(ctx, next) {
  if (ctx.message?.new_chat_members?.length) {
    const promises = ctx.message.new_chat_members.map(
      cm => userCaptcha(ctx, cm.id)
    );
    runDangling(promises);
  } else if (ctx.chatMember) {
    // TODO
  }
  return next();
}
