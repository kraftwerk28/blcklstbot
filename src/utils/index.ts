import { URL } from "url";
import crypto from "crypto";
import { promises as fs } from "fs";
import { fetch } from "undici";
import path from "path";
import { Message, ChatMember } from "grammy/types";

export * as html from "./html.js";
import {
  ChatLanguageCode,
  EnryResponse,
  GuardPredicate,
  LocaleContainer,
  Context,
} from "../types/index.js";
import { log } from "../logger.js";

export function noop() {
  // Noop
}

/** Run Promise(s) w/o awaiting and log errors, if any */
export async function safePromiseAll(
  args: Promise<any> | Promise<any>[],
): Promise<void> {
  const results = await Promise.allSettled(Array.isArray(args) ? args : [args]);
  for (const result of results) {
    if (result.status === "rejected") {
      log.error(result.reason);
    }
  }
}

export function regexp(parts: TemplateStringsArray, ...inBetweens: any[]) {
  return new RegExp(String.raw(parts, ...inBetweens));
}

export function randInt(a: number, b?: number) {
  if (typeof b === "number") {
    return Math.floor(Math.random() * (b - a)) + a;
  } else {
    return Math.floor(Math.random() * a);
  }
}

export function randBool() {
  return Math.random() < 0.5;
}

export function csIdGen(len = 8): string {
  return crypto.randomBytes(len).toString("hex");
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

// export function all<C extends Context = Context>(
//   ...predicates: GuardPredicate<C>[]
// ) {
//   return (ctx: C) =>
//     Promise.all(predicates.map((p) => p(ctx))).then((results) =>
//       results.every(Boolean),
//     );
// }

export const dev = process.env.NODE_ENV === "development";

// export function getUserFromAnyMessage(message: Message): User | null {
//   if (message.new
// }
export function getCodeFromMessage(msg: Message): string | undefined {
  if (!msg.entities || !msg.text) return;
  const codeEntities = msg.entities.filter(
    (e) => e.type === "pre" || e.type === "code",
  );
  if (codeEntities.length !== 1) {
    // TODO:  Need to merge multiple entities into one
    return;
  }
  const { length, offset } = codeEntities[0]!;
  // Return only if the whole message is code
  if (offset === 0 && length === msg.text.length) {
    const codeSource = msg.text.slice(offset, offset + length);
    return codeSource;
  }
}

const OUT_OF_CHAT_STATUS: ChatMember["status"][] = ["left", "kicked"];
const IN_CHAT_STATUS: ChatMember["status"][] = [
  "member",
  "administrator",
  "creator",
];

// export function getNewMembersFromUpdate(
//   update: Update.ChatMemberUpdate | Update.MessageUpdate,
// ): User[] | null {
//   if ("chat_member" in update) {
//     const chatMember = update.chat_member;
//     const oldMember = chatMember.old_chat_member;
//     const newMember = chatMember.new_chat_member;
//     if (
//       OUT_OF_CHAT_STATUS.includes(oldMember.status) &&
//       IN_CHAT_STATUS.includes(newMember.status)
//     ) {
//       return [newMember.user];
//     } else {
//       return null;
//     }
//   } else if ("new_chat_members" in update.message) {
//     return update.message.new_chat_members;
//   } else {
//     return null;
//   }
// }

// export function getLeftMemberFromUpdate(
//   update: Update.ChatMemberUpdate | Update.MessageUpdate,
// ): User | null {
//   if ("chat_member" in update) {
//     const chatMember = update.chat_member;
//     const oldMember = chatMember.old_chat_member;
//     const newMember = chatMember.new_chat_member;
//     if (
//       IN_CHAT_STATUS.includes(newMember.status) &&
//       OUT_OF_CHAT_STATUS.includes(oldMember.status)
//     ) {
//       return newMember.user;
//     } else {
//       return null;
//     }
//   } else if ("left_chat_member" in update.message) {
//     return update.message.left_chat_member;
//   } else {
//     return null;
//   }
// }

export async function runTreeSitterHighlight(lang: string, code: string) {
  const hlServerUrl = new URL(process.env.TREE_SITTER_SERVER_HOST!);
  hlServerUrl.searchParams.append("lang", lang);
  const response = await fetch(hlServerUrl, {
    method: "POST",
    body: code,
  });
  if (response.status === 200) {
    return response.body ?? undefined;
  }
}

export async function runEnry(code: string): Promise<EnryResponse | undefined> {
  const response = await fetch(process.env.ENRY_SERVER_HOST!, {
    method: "POST",
    body: code,
  });
  if (!response.ok) return;
  return (await response.json()) as Promise<EnryResponse>;
}

export async function uploadToGist(
  info: EnryResponse,
  sourceCode: string,
): Promise<string | null> {
  const { language, extension } = info;
  const url = new URL(
    `${process.env.GITHUB_API_HOST}/gists/${process.env.GITHUB_GIST_ID}`,
  );
  const headers = {
    Authorization: `token ${process.env.GITHUB_API_KEY}`,
  };
  const fileStem = csIdGen();
  const body = {
    files: { [`${fileStem}.${extension}`]: { language, content: sourceCode } },
  };
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (response.status !== 200) {
    return null;
  }
  try {
    const responseJson = (await response.json()) as { html_url: string };
    return `${responseJson.html_url as string}#file-${fileStem}-${extension}`;
  } catch {
    return null;
  }
}

export async function loadLocales(): Promise<LocaleContainer> {
  const dir = "locales/";
  const files = await fs.readdir(dir);
  const result = {} as LocaleContainer;
  for (const file of files) {
    const fullPath = path.resolve(dir, file);
    const localeName = path.parse(fullPath).name as ChatLanguageCode;
    const raw = await fs.readFile(fullPath, "utf-8");
    result[localeName] = JSON.parse(raw);
    log.info('Loaded "%s" locale (%s)', localeName, file);
  }
  return result;
}
