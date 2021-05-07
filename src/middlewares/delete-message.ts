import { Middleware } from 'telegraf';
import { Ctx } from '../types';

export const deleteMessage: Middleware<Ctx> = async function(ctx) {
  ctx.deleteMessage().catch();
};
