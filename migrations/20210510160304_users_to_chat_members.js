/** @param {import('knex').Knex} knex */
export async function up(knex) {
  // await knex.schema.dropTable('users');
  await knex.schema.alterTable("users", (table) => {
    table.dropPrimary();
    table.bigInteger("chat_id").notNullable();
    table.primary(["id", "chat_id"]);
  });
};

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropPrimary();
    table.dropColumn("chat_id");
    table.primary("id");
  });
};
