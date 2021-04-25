import '../lib/api';
import { config } from 'dotenv';
import { Api } from '../lib/api';

async function main() {
  config();
  console.log('Dotenv loaded');
  const UID = 12345678;
  const api = new Api(process.env.API_TOKEN!, 12345678);

  console.dir(await api.getBlacklist());

  console.log('Adding user...');
  await api.addUser({
    telegram_id: UID,
    first_name: 'Test first name',
    last_name: 'Test last name',
    username: 'foo_bar_baz',
    message: 'bruh',
    reason: 'bruh2',
  });

  console.dir(await api.getBlacklist());
  console.dir(await api.checkUser(UID));

  console.log('deleting user...');
  await api.rmUser(UID);

  console.dir(await api.getBlacklist());
  console.dir(await api.checkUser(UID));
}

main();
