/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  // await knex.schema.dropTable('users');
  await knex.schema.alterTable("users", (table) => {
    table.dropPrimary();
    table.bigInteger("chat_id").notNullable();
    table.primary(["id", "chat_id"]);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropPrimary();
    table.dropColumn("chat_id");
    table.primary("id");
  });
};
