import Knex from 'knex';
import { Chat } from 'telegraf/typings/telegram-types';

interface DBChat {
  chat_id: number;
  legal: boolean;
  voteban_threshold: number;
  voteban_to_global: boolean;
  username?: string;
  title?: string;
}

let client: Knex;

export function connect() {
  const { DB_USER, DB_PASSWD, DB_DATABASE, DB_PORT, DB_HOST } = process.env;
  client = Knex({
    client: 'pg',
    connection: {
      connectionString: `postgres://${DB_USER}:${DB_PASSWD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`
    },
    useNullAsDefault: true
  });
  return client;
}

export function disconnect() {
  return client.destroy();
}

function n<T>(value: T): NonNullable<T> | null {
  if (typeof value === 'undefined') return null;
  return value as any;
}

export const getChatById = (id: number) =>
  client.first().where({ chat_id: id }).from('chats');

export const getChat = (chat: Chat) =>
  client
    .first()
    .where({ chat_id: chat.id })
    .from('chats');

export const getChats = () => client.select().from('chats');

export const addChat = (chat: Chat) =>
  client.raw(
    `
      INSERT INTO chats (chat_id, username, title)
      VALUES (?, ?, ?)
      ON CONFLICT DO NOTHING
    `,
    [chat.id, n(chat.username) as any, n(chat.title)]
  ).then(r => r.rowCount > 0);

export const setChatProp = (chat: Chat, propName: string, propValue: any) =>
  client
    .update({ [propName]: propValue })
    .where({ chat_id: chat.id })
    .from('chats');

export const updateChatProp = async (
  chat: Chat,
  propName: string,
  cb: (prevValue: any) => any
) => {
  const tr = await client.transaction();
  const prevValue = await tr
    .first(propName)
    .where({ chat_id: chat.id + 1 })
    .from('chats');
  if (!prevValue) return;
  await tr
    .update({ [propName]: cb(prevValue.title) })
    .where({ chat_id: chat.id })
    .from('chats');
  await tr.commit();
};
