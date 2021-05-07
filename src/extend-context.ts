import IORedis from 'ioredis';
import createKnex from 'knex';
import { Telegraf } from 'telegraf';
import { Message } from 'typegram';
import { BOT_SERVICE_MESSAGES_TIMEOUT } from './constants';

import { DbStore } from './db-store';
import { EventQueue } from './event-queue';
import { log } from './logger';
import { Ctx } from './types';
import { ensureEnvExists } from './utils';

export async function extendBotContext(bot: Telegraf<Ctx>) {
  const ctx = bot.context;
  log.info('Connecting to Redis...');
  const redisClient = new IORedis({
    host: process.env.REDIS_HOST,
    retryStrategy: times => (times < 5) ? 1 : null,
  });
  log.info('Connecting to Postgres...');
  const knex = createKnex({
    client: 'pg',
    connection: {
      connectionString: process.env.PG_CONNECTION_STRING,
    },
  });
  log.info('Current DB migration: %s', await knex.migrate.currentVersion());
  await knex.migrate.latest();
  log.info('Latest DB migration: %s', await knex.migrate.currentVersion());
  const dbStore = new DbStore(knex, redisClient);

  ctx.dbStore = dbStore;
  ctx.eventQueue = new EventQueue(bot.telegram, dbStore);
  ctx.botCreatorId = parseInt(ensureEnvExists('KRAFTWERK28_UID'));
  ctx.deleteItSoon = function(this: Partial<Ctx>) {
    return (msg: Message) => {
      if (!this.chat) {
        return msg;
      }
      this.eventQueue?.pushDelayed(
        BOT_SERVICE_MESSAGES_TIMEOUT,
        'delete_message',
        {
          chatId: this.chat.id,
          messageId: msg.message_id,
        },
      );
      return msg;
    };
  };
}
