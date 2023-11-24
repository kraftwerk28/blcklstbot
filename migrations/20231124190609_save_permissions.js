/** @param {import("knex").Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.json("saved_permissions");
  });
}

/** @param {import("knex").Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("saved_permissions");
  });
}
