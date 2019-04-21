import { Client } from 'pg'

const {
  DB_USER: user,
  DB_PASSWD: password,
  DB_DATABASE: database
} = process.env

const client = new Client({ database, user, password })
const _query = (query, ...values) => client
  .query(query, values)
  .then(d => d.rows)

export const connect = client.connect
export const disconnect = client.end

export const getGroup = async (groupId) => client.query(`
  SELECT * FROM groups
  WHERE group_id = $1
`, [groupId]).then(d => d.rows[0])

export const groupExists = async (groupUserName) => client.query(`
  SELECT * FROM groups
  WHERE group_username = $1
`, groupUserName).then(d => d.rowCount > 0)

export const addGroup = async ({ id, username, type }) => _query(`
  INSERT INTO groups
  (group_id, group_username, group_type)
  VALUES($1, $2, $3)
`, id, username, type)
