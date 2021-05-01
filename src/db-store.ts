import { Redis } from "ioredis";
import { Pool } from "pg";
import { Captcha } from "./utils/captcha";

export class DbStore {
  constructor(public pgClient: Pool, public redisClient: Redis) {
  }

  private captchaKey(chatId: number, userId: number) {
    return `captcha:${chatId}:${userId}`;
  }

  async addPendingCaptcha(chatId: number, userId: number, captcha: Captcha) {
    const key = this.captchaKey(chatId, userId);
    await this.redisClient.set(key, captcha.serialize());
    // TODO: editable expire time
    await this.redisClient.expire(key, 60 * 5);
  }

  async hasPendingCaptcha(
    chatId: number,
    userId: number,
  ): Promise<Captcha | null> {
    const key = this.captchaKey(chatId, userId);
    const value = await this.redisClient.get(key);
    return value ? Captcha.deserialize(value) : null;
  }
}
