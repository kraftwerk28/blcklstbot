import { createLogger, transports, Logger, format } from 'winston';
import util from 'util';

export let log: Logger;

const consoleConfig: transports.ConsoleTransportOptions = {
  format: format.combine(
    format.timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }),
    format.splat(),
    format.colorize(),
    format.printf((info) => {
      const { message, stack, timestamp, level, label } = info;
      let text;
      if (stack) {
        text = message + '\n' + stack;
      } else if (typeof message === 'object') {
        text = util.inspect(message, { colors: true });
      } else {
        text = message;
      }
      return `[${timestamp}]${label ? (' ' + label) : ''} ${level} ${text}`;
    })
  ),
};

export function initLogger() {
  log = createLogger({
    transports: [
      new transports.Console(consoleConfig),
    ],
  });
}
