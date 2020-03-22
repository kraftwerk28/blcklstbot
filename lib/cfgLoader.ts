import { readFileSync } from 'fs';
import { resolve } from 'path';

const cfgPath = resolve('bot.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8').trim());

export const replicas = cfg.replicas;
export const commands = cfg.commands;
