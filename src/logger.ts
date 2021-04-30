import { createLogger, transports, Logger, format } from 'winston';
import util from 'util';

export let log: Logger;

const consoleFormat = format.combine(
  format.timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }),
  format.splat(),
  format.colorize(),
  format.printf(({ message, timestamp, level, label }) => {
    const text = typeof message === 'object'
      ? util.inspect(message, { colors: true })
      : message;
    return `[${timestamp}]${label ? ' ' + label : ''} ${level} ${text}`;
  })
);

export function initLogger() {
  log = createLogger({
    transports: [
      new transports.Console({ format: consoleFormat })
    ],
  });
}
