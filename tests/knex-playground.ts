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

type WithArr = {
  arr: string[]
};

(async () => {
  await kn('has_array').insert({ arr: ['hello', 'world'] });
  for (const row of await kn<WithArr>('has_array').select()) {
    console.log(row.arr);
  }
  await kn.destroy();
  // const createdTable = await pool.query(`
  //   create table if not exists has_array (
  //     arr varchar[]
  //   )
  // `);
  // console.log(createdTable);
  // console.log(
  //   await pool.query(`
  //     insert into has_array values('{"arithmetic", "button"}')
  //   `)
  // );
  // const select = await pool.query<{ arr: string[] }>(`
  //   select * from has_array
  // `);
  // for (let i = 0; i < select.rowCount; i++) {
  //   console.log(i, select.rows[i].arr);
  // }
  // pool.end();
})();
