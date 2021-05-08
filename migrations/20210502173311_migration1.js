'use strict';

/** @param {import('knex').Knex} knex */
exports.up = async function(knex) {
  await knex.schema.createTable('chats', (table) => {
    // Telegram data
    table.bigInteger('id').notNullable().primary();
    table.string('title').notNullable();
    table.string('username').notNullable();

    // Internal data
    table.specificType('captcha_modes', 'varchar[8]').defaultTo('{}');
    table.integer('captcha_timeout').defaultTo(60).notNullable();
    table.string('language_code', 2).notNullable().defaultTo('en');
    table.integer('rules_message_id').nullable();
    table.boolean('delete_slash_commands').notNullable().defaultTo(false);
    table.boolean('replace_code_with_pic').notNullable().defaultTo(false);
    table.boolean('delete_joins').notNullable().defaultTo(false);
  });

  await knex.schema.createTable('users', (table) => {
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
    table.string('warn_ban_reason').nullable();
  });
}

/** @param {import('knex').Knex} knex */
exports.down = async function(knex) {
  await knex.schema.dropTable('chats');
  await knex.schema.dropTable('users');
}
