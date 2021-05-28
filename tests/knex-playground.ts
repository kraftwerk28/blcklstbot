import { Pool } from 'pg';
import knex from 'knex';

// const pool = new Pool({
//   connectionString: 'postgres://kraftwerk28:271828@localhost',
// });
const kn = knex({
  client: 'pg',
  connection: {
    connectionString: 'postgres://kraftwerk28:271828@localhost',
  },
});

(async () => {
  await kn.schema.dropTableIfExists('foo');
  await kn.schema.createTable('foo', table => {
    table.increments('id');
    table.string('name').nullable();
  });
  await kn('foo').insert({});
  await kn('foo').insert({});
  console.dir(await kn('foo').select());
  console.dir(await kn('foo').first());
  await kn('foo').del();
  console.dir(await kn('foo').first());
  await kn.schema.dropTable('foo');
  await kn.destroy();
})();
