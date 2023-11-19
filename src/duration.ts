// Duration format: https://prometheus.io/docs/alerting/latest/configuration/#duration
// Example: 1d, 1h30m, 5m, 10s
export const durationPattern = String.raw`^(?:(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?|0)$`;

const durationRe = new RegExp(durationPattern);

class BadDurationError extends Error {
  constructor(public raw: string) {
    super("Invalid duration format");
  }
}

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export function parse(raw: string): number;
export function parse(raw: string | undefined, fallback: string): number;
export function parse(raw?: string, fallback?: string): number {
  const input = raw ?? fallback ?? "";
  const match = input.match(durationRe);
  if (!match) {
    throw new BadDurationError(input);
  }
  const days = parseInt(match[1] ?? "");
  const hours = parseInt(match[2] ?? "");
  const minutes = parseInt(match[3] ?? "");
  const seconds = parseInt(match[4] ?? "");
  let result = 0;
  if (!Number.isNaN(days)) result += days * DAY;
  if (!Number.isNaN(hours)) result += hours * HOUR;
  if (!Number.isNaN(minutes)) result += minutes * MINUTE;
  if (!Number.isNaN(seconds)) result += seconds;
  return result;
}

export function stringify(seconds: number) {
  const days = Math.floor(seconds / DAY);
  seconds -= days * DAY;
  const hours = Math.floor(seconds / HOUR);
  seconds -= hours * HOUR;
  const minutes = Math.floor(seconds / MINUTE);
  seconds -= minutes * MINUTE;
  let ret = "";
  if (days > 0) ret += days + "d";
  if (hours > 0) ret += hours + "h";
  if (minutes > 0) ret += minutes + "m";
  if (seconds > 0 || !ret) ret += seconds + "s";
  return ret;
}
