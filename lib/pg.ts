import { Pool } from 'pg';
import type { Chat } from 'telegraf/typings/telegram-types';

interface DBChat {
  chat_id: number;
  legal: boolean;
  voteban_threshold: number;
  voteban_to_global: boolean;
  username?: string;
  title?: string;
}

export class PgClient {
  pg: Pool;

  constructor() {
    const { PG_USER, PG_PASS, PG_HOST, PG_PORT, PG_DB } = process.env;
    this.pg = new Pool({
      host: PG_HOST,
      port: parseInt(PG_PORT ?? '5432'),
      user: PG_USER,
      password: PG_PASS,
      database: PG_DB,
    });
  }

  disconnect() {
    return this.pg.end();
  }

  getChatById = (id: number): Promise<DBChat | undefined> =>
    this.pg.query('select * from chats where chat_id = ? limit 1', [id])
      .then(r => r.rows[0], () => undefined);

  getChat = (chat: Chat): Promise<DBChat | undefined> =>
    this.pg.query('select * from chats where chat_id = ? limit 1', [chat.id])
      .then(r => r.rows[0], () => undefined);

  getChats = (): Promise<DBChat[]> => this.pg.query('select * from chats')
    .then(r => r.rows);

  addChat = async (
    chat: Chat & Chat.TitleChat & Chat.UserNameChat
  ): Promise<boolean> => {
    const query = `
      insert into chats (chat_id, username, title) values (?, ?, ?)
      on conflict do nothing
    `;
    return this.pg.query(query, [chat.id, chat.username, chat.title])
      .then(r => r.rowCount > 1, () => false);
  }


  setChatProp = <T>(chat: Chat, prop: string, value: T) => this.pg.query(
    'update chats set ? = ? where chat_id = ?',
    [prop, value, chat.id],
  );

  updateChatProp = async <K extends keyof Chat>(
    chat: Chat,
    propName: string,
    cb: (prevValue: K) => Chat[K]
  ): Promise<boolean> => {
    const row = await this.pg.query(
      'select ? from chats where chat_id = ? limit 1',
      [propName, chat.id],
    )
      .then(r => r.rows[0]);
    if (row === undefined) return false;
    const nextVal = cb(row[propName]);
    return this.pg.query(
      'update chats set ? = ? where chat_id = ?',
      [propName, nextVal, chat.id],
    )
      .then(r => r.rowCount === 1, () => false);
  };
}
