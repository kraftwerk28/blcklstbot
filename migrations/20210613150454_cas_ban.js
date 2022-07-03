/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.boolean("enable_cas").notNullable().defaultTo(true);
    table.dropColumn("rules_message_id");
  });
  await knex.schema.alterTable("users", (table) => {
    table.boolean("ignore_cas").notNullable().defaultTo(false);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.dropColumn("enable_cas");
    table.dropColumn("rules_message_id");
    table.integer("rules_message_id").nullable();
  });
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("ignore_cas");
  });
};
