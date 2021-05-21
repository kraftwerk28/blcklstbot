import { Middleware as TMiddleware } from 'telegraf';
import { log } from '../logger';
import { Ctx, MatchedContext } from '../types';
import { help } from './help';

type Middleware = TMiddleware<
  MatchedContext<Ctx, 'text'> & { startPayload: string }
>;

export const start: Middleware = async function (ctx, next) {
  const { startPayload } = ctx;
  log.info('Start payload: "%s"', startPayload);
  return help(ctx, next);
};
