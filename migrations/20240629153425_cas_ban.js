/** @param {import("knex").Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.boolean("use_cas_ban").notNullable().defaultTo(true);
  });
}

/** @param {import("knex").Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.dropColumn("use_cas_ban");
  });
}
