/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable("user_messages", (table) => {
    table.primary(["chat_id", "message_id"]);
  });
};

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable("user_messages", (table) => {
    table.dropPrimary();
  });
};
