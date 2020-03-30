import { readFileSync } from 'fs';
import { resolve } from 'path';

const f = readFileSync(resolve(__dirname, '../../commands.txt'), 'utf-8');

export const helpText = () =>
  f
    .split('\n')
    .map(s => s.trim())
    .filter(s => s)
    .map(s => '/' + s)
    .join('\n');
