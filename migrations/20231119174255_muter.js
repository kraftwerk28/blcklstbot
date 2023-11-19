/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.bigInteger("mute_duration");
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("mute_duration");
  });
};
