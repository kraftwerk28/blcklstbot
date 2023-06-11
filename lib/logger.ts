import { transports, format, createLogger } from "winston";

export const log = createLogger({
  transports: [new transports.Console()],
  format: format.combine(
    format.timestamp({ format: "DD.MM.YYYY HH:mm:ss" }),
    format.splat(),
    format.metadata({ fillExcept: ["message", "level", "timestamp", "label"] }),
    format.colorize(),
    format.printf(({ message, timestamp, level, label }) =>
      [`[${timestamp}] ${level}`, label ?? "", message].join(" "),
    ),
  ),
});
