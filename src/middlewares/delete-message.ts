import { Middleware } from "telegraf";
import { Ctx } from "../types";
import { noop } from "../utils";

export const deleteMessage: Middleware<Ctx> = async function (ctx) {
  if (ctx.dbChat?.delete_slash_commands) {
    await ctx.deleteMessage().catch(noop);
  }
};
