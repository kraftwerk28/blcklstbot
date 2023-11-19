import { CommandContext, Filter, Middleware, MiddlewareFn } from "grammy";
import { Context } from "../types";

const splitArgs: MiddlewareFn<
  Filter<CommandContext<Context>, "message">
> = async (ctx, next) => {
  ctx.commandArgs = ctx.match.split(/\s+/).filter(Boolean);
  return next();
};

export default splitArgs;
