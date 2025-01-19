/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.boolean("propagate_bans").notNullable().defaultTo(false);
  });
};

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.dropColumn("propagate_bans");
  });
};
