import IORedis from 'ioredis';
import { Pool } from 'pg';
import { Telegraf } from 'telegraf';

import { DbStore } from './db-store';
import { EventQueue } from './event-queue';
import { Ctx } from './types';

export async function extendBotContext(bot: Telegraf<Ctx>) {
  const ctx = bot.context;
  const redisClient = new IORedis();
  const pgPool = new Pool();
  const dbStore = new DbStore(pgPool, redisClient);
  ctx.dbStore = dbStore;
  ctx.eventQueue = new EventQueue(bot.telegram, dbStore);
}
