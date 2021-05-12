/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.timestamp('banned_timestamp').nullable();
  });
  await knex.schema.alterTable('chats', (table) => {
    table.boolean('upload_to_gist').notNullable().defaultTo(false);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('banned_timestamp');
  });
  await knex.schema.alterTable('chats', (table) => {
    table.dropColumn('upload_to_gist');
  });
};
