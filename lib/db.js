import { Client } from 'pg'

const {
  DB_USER: user,
  DB_PASSWD: password,
  DB_DATABASE: database
} = process.env

const client = new Client({ database, user, password })
const _query = async (query, ...values) => client
  .query(query, values)
  .then(d => d.rows)

export const connect = client.connect
export const disconnect = client.end

export const getGroup = async (groupId) => _query(`
  SELECT * FROM groups
  WHERE group_id = $1
`, groupId)

export const addGroup = async (groupId) => _query(`
  INSERT INTO groups
  (group_id)
  VALUES($1)
`, groupId)
