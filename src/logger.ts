import { pino, Logger } from 'pino';

export let log: Logger;

export function initLogger() {
  log = pino();
}
