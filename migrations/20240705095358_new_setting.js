/** @param {import("knex").Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.boolean("delete_substitute_prompt").notNullable().defaultTo(false);
  });
}

/** @param {import("knex").Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.dropColumn("delete_substitute_prompt");
  });
}
