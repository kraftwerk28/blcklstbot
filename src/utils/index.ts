import type { MessageEntity } from 'typegram';

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

const ENTITY_TYPE_TAGS: { [K in MessageEntity['type']]?: string } = {
  bold: 'b',
  italic: 'i',
  underline: 'u',
  strikethrough: 's',
  code: 'code',
  pre: 'pre',
}

export function applyHtmlEntities(raw: string, entities: MessageEntity[]) {
  let result = raw;
  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    let tagStart: string, tagEnd: string;
    if (entity.type === 'text_link') {
      tagStart = `<a href="${entity.url}">`;
      tagEnd = '<a>';
    } else if (entity.type in ENTITY_TYPE_TAGS) {
      const tagStr = ENTITY_TYPE_TAGS[entity.type];
      tagStart = `<${tagStr}>`;
      tagEnd = `</${tagStr}>`;
    } else {
      continue;
    }
    const { offset, length } = entity;
    result = result.slice(0, offset) + tagStart +
      result.slice(offset, offset + length) +
      tagEnd + result.slice(offset + length);
  }
  return result;
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
