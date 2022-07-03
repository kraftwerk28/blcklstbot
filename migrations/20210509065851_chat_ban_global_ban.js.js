/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.boolean("propagate_bans").notNullable().defaultTo(false);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.dropColumn("propagate_bans");
  });
};
