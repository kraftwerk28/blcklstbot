import { resolve } from 'path';
import { existsSync } from 'fs';
import { config } from 'dotenv';

if (process.env.NODE_ENV === 'development') {
  const path = resolve(__dirname, '../../.env');
  if (!existsSync(path)) {
    throw new Error('No .env file found.');
  }
  console.log('Loading .env configuration.');
  config({ path });
}
