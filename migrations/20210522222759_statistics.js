/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.createTable("stats", (table) => {
    table.bigInteger("chat_id").notNullable().primary();
    table.integer("captcha_kick_count").defaultTo(0);
    table.integer("banned_count").defaultTo(0);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("stats");
};
