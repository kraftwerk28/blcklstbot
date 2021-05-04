import { Knex } from 'knex';
import { CHATS_TABLE_NAME, USERS_TABLE_NAME } from '../src/constants';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(CHATS_TABLE_NAME, (table) => {
    // Telegram data
    table.bigInteger('id').notNullable().primary();
    table.string('title').notNullable();
    table.string('username').notNullable();

    // Internal data
    table.specificType('captcha_modes', 'varchar[8]').defaultTo('{arithmetic}');
    table.integer('captcha_timeout').defaultTo(60).notNullable();
    table.string('language_code', 2).notNullable().defaultTo('en');
    table.integer('rules_message_id').nullable();
    table.boolean('delete_slash_commands').notNullable().defaultTo(false);
    table.boolean('replace_code_with_pic').notNullable().defaultTo(false);
  });

  await knex.schema.createTable(USERS_TABLE_NAME, (table) => {
    // Telegram data
    table.bigInteger('id').notNullable().primary();
    table.string('username').nullable();
    table.string('first_name').notNullable();
    table.string('last_name').nullable();
    table.string('language_code', 2).nullable();

    // Internal data
    table.boolean('approved').notNullable().defaultTo(false);
    table.integer('warnings_count').notNullable().defaultTo(0);
    table.boolean('banned').notNullable().defaultTo(0);
    table.string('banned_reason').nullable();
  });
}


export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(CHATS_TABLE_NAME);
  await knex.schema.dropTable(USERS_TABLE_NAME);
}

