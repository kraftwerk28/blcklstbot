import { Redis } from 'ioredis';
import { Knex } from 'knex';
import { CHATS_TABLE_NAME } from './constants';
import { AbstractCaptcha, DbChat } from './types';
import { Captcha } from './utils/captcha';

export class DbStore {
  constructor(
    public readonly knex: Knex,
    public readonly redisClient: Redis,
  ) { }

  private captchaRedisKey(chatId: number, userId: number) {
    return `captcha:${chatId}:${userId}`;
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
    return this
      .knex(CHATS_TABLE_NAME)
      .where({ id: chatId })
      .update({ [prop]: value });
  }

  async addChat(chat: Partial<Pick<DbChat, 'id' | 'title' | 'username'>>) {
    const insertResult =
      await this.knex(CHATS_TABLE_NAME).insert(chat).onConflict('id').ignore();
    return insertResult.length > 0;
  }
}
