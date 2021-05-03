export * as html from './html';
import { log } from '../logger';

/** Run Promise(s) w/o awaiting and log errors, if any */
export function runDangling(args: Promise<any> | Promise<any>[]): void {
  Promise.allSettled(Array.isArray(args) ? args : [args]).then(results => {
    for (const result of results) {
      if (result.status === 'rejected') {
        log.error(result.reason);
      }
    }
  });
}

export function regexp(parts: TemplateStringsArray, ...inBetweens: any[]) {
  return new RegExp(String.raw(parts, ...inBetweens));
}

export function randInt(a: number, b?: number) {
  if (typeof b === 'number') {
    return Math.floor(Math.random() * (b - a)) + a;
  } else {
    return Math.floor(Math.random() * a);
  }
}

export function randBool() { return Math.random() < 0.5 }

export function ensureEnvExists(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(
      `Environment variable ${name} is required, but not defined`
    );
  }
  return value;
}

export function idGenerator(initial = 0) {
  let id = initial;
  return () => id++;
}
