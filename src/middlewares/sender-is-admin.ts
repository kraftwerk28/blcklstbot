import { OnMiddleware } from '../types';
type Middleware = OnMiddleware<'message'>;
export const senderIsAdmin: Middleware = async function(ctx, next) {
  if (ctx.from.id === ctx.botCreatorId) {
    // XD
    return next();
  }
  const cm = await ctx.getChatMember(ctx.from.id);
  if (cm.status === 'administrator' || cm.status === 'creator') {
    return next();
  }
};
