import { Redis } from 'ioredis';
import { Knex } from 'knex';
import { CHATS_TABLE_NAME } from './constants';
import { log } from './logger';
import { AbstractCaptcha, DbChat } from './types';
import { Captcha } from './utils/captcha';

export class DbStore {
  constructor(public readonly knex: Knex, public readonly redisClient: Redis) { }

  private captchaRedisKey(chatId: number, userId: number) {
    return `captcha:${chatId}:${userId}`;
  }

  private messageTrackRedisKey(chatId: number, userId: number) {
    return `tracked_messages:${chatId}:${userId}`;
  }

  async addPendingCaptcha(
    chatId: number,
    userId: number,
    captcha: AbstractCaptcha,
    timeoutSeconds: number,
  ) {
    const key = this.captchaRedisKey(chatId, userId);
    await this.redisClient.set(key, captcha.serialize());
    // TODO: editable expire time
    await this.redisClient.expire(key, timeoutSeconds);
  }

  async hasPendingCaptcha(
    chatId: number,
    userId: number,
  ): Promise<Captcha | null> {
    const key = this.captchaRedisKey(chatId, userId);
    const value = await this.redisClient.get(key);
    return value ? Captcha.deserialize(value) : null;
  }

  async getChat(chatId: number): Promise<DbChat | null> {
    return this.knex(CHATS_TABLE_NAME).where({ id: chatId }).first();
  }

  async updateChatProp<Prop extends keyof DbChat>(
    chatId: number,
    prop: Prop,
    value: DbChat[Prop],
  ) {
    return this.knex(CHATS_TABLE_NAME)
      .where({ id: chatId })
      .update({ [prop]: value });
  }

  async addChat(chat: Partial<Pick<DbChat, 'id' | 'title' | 'username'>>) {
    const insertQuery = this.knex(CHATS_TABLE_NAME).insert(chat);
    const insertResult = await this.knex.raw(
      '? on conflict(id) do update set id = excluded.id returning *',
      [insertQuery],
    );
    return insertResult.rows[0] as DbChat;
  }

  async startMemberTracking(chatId: number, userId: number) {
    const key = this.messageTrackRedisKey(chatId, userId);
    await this.redisClient.sadd(key, -1);
    await this.redisClient.expire(key, 24 * 60 * 60);
  }

  async trackMessage(chatId: number, userId: number, messageId: number) {
    const key = this.messageTrackRedisKey(chatId, userId);
    const existingKeys = await this.redisClient.keys(key);
    if (!existingKeys.length) {
      return;
    }
    await this.redisClient.sadd(key, messageId);
    log.info(key);
    log.info(await this.redisClient.smembers(key));
  }

  async getTrackedMessages(chatId: number, userId: number) {
    const key = this.messageTrackRedisKey(chatId, userId);
    const result = await this.redisClient.smembers(key);
    await this.redisClient.del(key);
    return result.map(it => parseInt(it));
  }

  shutdown() {
    return Promise.all([this.redisClient.quit(), this.knex.destroy()]);
  }
}
