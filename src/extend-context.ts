import IORedis from 'ioredis';
import createKnex from 'knex';
import { Telegraf } from 'telegraf';

import { DbStore } from './db-store';
import { EventQueue } from './event-queue';
import { Ctx } from './types';
import { ensureEnvExists } from './utils';

export async function extendBotContext(bot: Telegraf<Ctx>) {
  const ctx = bot.context;
  const redisClient = new IORedis();
  const knex = createKnex({
    client: 'pg',
    connection: {
      connectionString: process.env.PG_CONNECTION_STRING,
    },
  });
  const dbStore = new DbStore(knex, redisClient);
  ctx.dbStore = dbStore;
  ctx.eventQueue = new EventQueue(bot.telegram, dbStore);
  ctx.botCreatorId = parseInt(ensureEnvExists('KRAFTWERK28_UID'));
}
