/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.alterTable('user_messages', (table) => {
    table.primary(['chat_id', 'message_id']);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.alterTable('user_messages', (table) => {
    table.dropPrimary();
  });
};
