/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.alterTable('chats', (table) => {
    table.string('username').nullable().alter();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.alterTable('chats', (table) => {
    table.string('username').notNullable().alter();
  });
};
