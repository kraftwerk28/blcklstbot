/** @param {import("knex").Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.boolean("enable_slots").notNullable().defaultTo(false);
  });
  await knex.schema.createTable("balance_trx", (table) => {
    table.increments("id").notNullable().primary();
    table.bigInteger("user_id").notNullable();
    table.integer("diff").notNullable();
    table.timestamp("timestamp").notNullable().defaultTo(knex.fn.now());
    table.integer("dice_value");
    table.text("dice_emoji");
    table.integer("current_balance").notNullable();
  });
}

/** @param {import("knex").Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable("chats", (table) => {
    table.dropColumn("enable_slots");
  });
  await knex.schema.dropTable("balance_trx");
}
