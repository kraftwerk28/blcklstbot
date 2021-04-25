import IORedis, { Redis } from 'ioredis';
import { isDev } from './utils';
import { EventEmitter } from 'events';

export class RedisClient extends EventEmitter {
  private client: Redis;
  private delExpireSeconds = 10 * 60;
  private botAdminStatusFlagExpire = 60 * 10;

  constructor() {
    super();
    const host = isDev() ? '127.0.0.1' : process.env.REDIS_HOST;
    this.client = new IORedis({ host });
  }

  async newSusUser(chatId: number, userId: number, messageId: number) {
    const key = `del:${chatId}:${userId}`;
    await this.client.lpush(key, messageId);
    await this.client.expire(key, this.delExpireSeconds);
  }

  /** Remember message from suspisious user */
  async addSusUserMessage(chatId: number, userId: number, messageId: number) {
    const key = `del:${chatId}:${userId}`;
    await this.client.lpush(key, messageId);
  }

  /** Get all sus user messages */
  async getSusUserMessages(chatId: number, userId: number) {
    const ids = await this.client.lrange(`del:${chatId}:${userId}`, 0, -1);
    return ids.map(n => parseInt(n));
  }

  async checkBotAdminStatus(chatId: number) {
    const result = await this.client.get(`admin:${chatId}`);
    switch (result) {
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        return null;
    }
  }

  setBotAdminStatus(chatId: number, isAdmin: boolean) {
    return this.client.setex(
      `admin:${chatId}`,
      this.botAdminStatusFlagExpire,
      isAdmin.toString(),
    );
  }
}
