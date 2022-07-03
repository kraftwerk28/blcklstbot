/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.createTable("dynamic_commands", (table) => {
    table.bigInteger("message_id").notNullable();
    table.bigInteger("chat_id").notNullable();
    table.primary(["message_id", "chat_id"]);
    table.string("command").notNullable();
    table.bigInteger("defined_by").notNullable();
    table.boolean("global").notNullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("dynamic_commands");
};
