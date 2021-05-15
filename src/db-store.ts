import { Redis } from 'ioredis';
import { Knex } from 'knex';
import { Message } from 'typegram';
import {
  CHATS_TABLE_NAME,
  DYN_COMMANDS_TABLE_NAME,
  USERS_TABLE_NAME,
} from './constants';
import {
  AbstractCaptcha,
  DbChat,
  DbChatFromTg,
  DbDynamicCommand,
  DbUser,
  DbUserFromTg,
  DbUserMessage,
} from './types';
import { deserializeCaptcha, serializeCaptcha } from './captcha';

export class DbStore {
  constructor(public readonly knex: Knex, public readonly redisClient: Redis) {}

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
    await this.redisClient.set(key, serializeCaptcha(captcha));
    // TODO: editable expire time
    await this.redisClient.expire(key, timeoutSeconds);
  }

  async hasPendingCaptcha(
    chatId: number,
    userId: number,
  ): Promise<AbstractCaptcha | null> {
    const key = this.captchaRedisKey(chatId, userId);
    const value = await this.redisClient.get(key);
    return value ? deserializeCaptcha(value) : null;
  }

  async deletePendingCaptcha(chatId: number, userId: number) {
    await this.redisClient.del(this.captchaRedisKey(chatId, userId));
  }

  async getChat(chatId: number): Promise<DbChat | null> {
    return this.knex(CHATS_TABLE_NAME).where({ id: chatId }).first();
  }

  private async genericUpdateProp<T extends { id: number }, K extends keyof T>(
    table: string,
    id: number,
    prop: K,
    value: T[K],
  ) {
    return this.knex(table)
      .where({ id })
      .update({ [prop]: value });
  }

  private async genericUpdate<T extends { id: number }>(
    table: string,
    partial: Partial<T> & { id: number },
  ) {
    return this.knex(table).where({ id: partial.id }).update(partial);
  }

  private async genericInsert<T extends object, U extends T = T>(
    entity: T,
    table: string,
    primaryKeys: (keyof U)[],
  ): Promise<U> {
    const insertQuery = this.knex(table).insert(entity);
    const actioncmd = Object.keys(entity)
      .map((key) => `${key} = excluded.${key}`)
      .join(', ');
    const pk = primaryKeys.join(', ');
    const insertResult = await this.knex.raw(
      `? on conflict(${pk}) do update set ${actioncmd} returning *`,
      [insertQuery],
    );
    return insertResult.rows[0] as U;
  }

  async updateChatProp<Prop extends keyof DbChat>(
    chatId: number,
    prop: Prop,
    value: DbChat[Prop],
  ) {
    return this.genericUpdateProp(CHATS_TABLE_NAME, chatId, prop, value);
  }

  async addChat(chat: DbChatFromTg): Promise<DbChat> {
    return this.genericInsert(chat, CHATS_TABLE_NAME, ['id']);
  }

  async addUser(user: DbUserFromTg, chatId: number): Promise<DbUser> {
    const { id, first_name, last_name, language_code, username } = user;
    const dbUser = {
      id,
      chat_id: chatId,
      first_name,
      last_name,
      language_code,
      username,
    };
    return this.genericInsert<DbUserFromTg, DbUser>(dbUser, USERS_TABLE_NAME, [
      'id',
      'chat_id',
    ]);
    // const insertQuery = this.knex(USERS_TABLE_NAME).insert();
    // const insertResult = await this.knex.raw(
    //   '? on conflict(id, chat_id) do update ' +
    //     'set id = excluded.id, chat_id = excluded.chat_id returning *',
    //   [insertQuery],
    // );
    // return insertResult.rows[0];
  }

  async getUser(chatId: number, userId: number): Promise<DbUser> {
    return this.knex(USERS_TABLE_NAME)
      .where({ id: userId, chat_id: chatId })
      .first();
  }

  async updateUser(
    partialUser: Partial<DbUser> & { id: number; chat_id?: number },
  ) {
    const whereClause: Record<string, number> = { id: partialUser.id };
    if (typeof partialUser.chat_id === 'number') {
      whereClause.chat_id = partialUser.chat_id;
    }
    return this.knex(USERS_TABLE_NAME).where(whereClause).update(partialUser);
  }

  async addUserMessage(message: Message) {
    return this.knex('user_messages').insert({
      chat_id: message.chat.id,
      user_id: message.from?.id,
      message_id: message.message_id,
      timestamp: new Date(message.date * 1000),
    });
  }

  async getUserMessages(chatId: number, userId: number): Promise<number[]> {
    return this.knex<DbUserMessage>('user_messages')
      .where({ chat_id: chatId, user_id: userId })
      .del('message_id');
  }

  async defineCommand(
    command: string,
    chatId: number,
    definedById: number,
    messageId: number,
    global: boolean,
  ) {
    return this.genericInsert<DbDynamicCommand>(
      {
        chat_id: chatId,
        message_id: messageId,
        defined_by: definedById,
        command,
        global,
      },
      DYN_COMMANDS_TABLE_NAME,
      ['message_id', 'chat_id'],
    );
  }

  async getCommand(command: string, chatId: number) {
    return this.knex<DbDynamicCommand>(DYN_COMMANDS_TABLE_NAME)
      .where({ command, chat_id: chatId })
      .orWhere({ command, global: true })
      .first();
  }

  async undefCommand(command: string, userId: number) {
    const nDeleted = await this.knex<DbDynamicCommand>(DYN_COMMANDS_TABLE_NAME)
      .where({
        command,
        defined_by: userId,
      })
      .del();
    return nDeleted > 0;
  }

  shutdown() {
    return Promise.all([this.redisClient.quit(), this.knex.destroy()]);
  }
}
