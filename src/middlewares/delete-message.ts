import { Middleware } from 'telegraf';
import { Ctx } from '../types';

export const deleteMessage: Middleware<Ctx> = async function (ctx) {
  if (ctx.dbChat?.delete_slash_commands) {
    ctx.deleteMessage().catch();
  }
};
