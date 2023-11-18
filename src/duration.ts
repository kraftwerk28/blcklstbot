// Duration format: https://prometheus.io/docs/alerting/latest/configuration/#duration
// Example: 1d, 1h30m, 5m, 10s
export const durationPattern = String.raw`^(?:(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?|0)$`;

const durationRe = new RegExp(durationPattern);

class BadDurationError extends Error {
  constructor(public raw: string) {
    super("Invalid duration format");
  }
}

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
  if (!Number.isNaN(days)) result += days * 24 * 60 * 60;
  if (!Number.isNaN(hours)) result += hours * 60 * 60;
  if (!Number.isNaN(minutes)) result += minutes * 60;
  if (!Number.isNaN(seconds)) result += seconds;
  return result;
}
