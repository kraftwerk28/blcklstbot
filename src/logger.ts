import { pino, Logger } from 'pino';

export let log: Logger;

export function initLogger() {
  log = pino({
    prettyPrint: { translateTime: 'dd.mm.yy HH:MM:ss' },
    base: null,
  });
}
