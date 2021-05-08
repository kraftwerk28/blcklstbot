import { Context as TelegrafContext } from 'telegraf';
import { ChatMember, Message, Update, User } from 'typegram';
export * as html from './html';
import { Ctx, GuardPredicate } from '../types';
import { log } from '../logger';

/** Run Promise(s) w/o awaiting and log errors, if any */
export async function safePromiseAll(
  args: Promise<any> | Promise<any>[],
): Promise<void> {
  const results = await Promise.allSettled(Array.isArray(args) ? args : [args]);
  for (const result of results) {
    if (result.status === 'rejected') {
      log.error(result.reason);
    }
  }
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

export function randBool() {
  return Math.random() < 0.5;
}

export function ensureEnvExists(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(
      `Environment variable ${name} is required, but not defined`,
    );
  }
  return value;
}

export function idGenerator(initial = 0) {
  let id = initial;
  return () => id++;
}

export function all<C extends TelegrafContext = Ctx>(
  ...predicates: GuardPredicate<C>[]
) {
  return (ctx: C) =>
    Promise.all(predicates.map((p) => p(ctx))).then((results) =>
      results.every(Boolean),
    );
}

export const dev = process.env.NODE_ENV === 'development';

// export function getUserFromAnyMessage(message: Message): User | null {
//   if (message.new
// }
export function getCodeFromMessage(msg: Message.TextMessage): string | null {
  if (!msg.entities) return null;
  const codeEntities = msg.entities.filter(
    (e) => e.type === 'pre' || e.type === 'code',
  );
  if (codeEntities.length !== 1) {
    // TODO:  Need to merge multiple entities into one
    return null;
  }
  const { length, offset } = codeEntities[0];
  const codeSource = msg.text.slice(offset, offset + length);
  return codeSource;
}

const OUT_OF_CHAT_STATUS: ChatMember['status'][] = ['left', 'kicked'];
const IN_CHAT_STATUS: ChatMember['status'][] = [
  'member',
  'administrator',
  'creator',
];

export function getNewMembersFromUpdate(
  update: Update.ChatMemberUpdate | Update.MessageUpdate,
): User[] | null {
  if ('chat_member' in update) {
    const chatMember = update.chat_member;
    const oldMember = chatMember.old_chat_member;
    const newMember = chatMember.new_chat_member;
    if (
      OUT_OF_CHAT_STATUS.includes(oldMember.status) &&
      IN_CHAT_STATUS.includes(newMember.status)
    ) {
      return [newMember.user];
    } else {
      return null;
    }
  } else if ('new_chat_members' in update.message) {
    return update.message.new_chat_members;
  } else {
    return null;
  }
}

export function getLeftMemberFromUpdate(
  update: Update.ChatMemberUpdate | Update.MessageUpdate,
): User | null {
  if ('chat_member' in update) {
    const chatMember = update.chat_member;
    const oldMember = chatMember.old_chat_member;
    const newMember = chatMember.new_chat_member;
    if (
      IN_CHAT_STATUS.includes(newMember.status) &&
      OUT_OF_CHAT_STATUS.includes(oldMember.status)
    ) {
      return newMember.user;
    } else {
      return null;
    }
  } else if ('left_chat_member' in update.message) {
    return update.message.left_chat_member;
  } else {
    return null;
  }
}
