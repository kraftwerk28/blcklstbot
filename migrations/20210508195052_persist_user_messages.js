/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.createTable('user_messages', (table) => {
    table.bigInteger('chat_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.integer('message_id').notNullable();
    table.timestamp('timestamp').notNullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.dropTable('user_messages');
};
