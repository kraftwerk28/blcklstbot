/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.string("username").nullable().alter();
  });
};

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.string("username").notNullable().alter();
  });
};
