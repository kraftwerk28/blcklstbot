import { URL } from "url";
import crypto from "crypto";
import { promises as fs } from "fs";
import { Context as TelegrafContext } from "telegraf";
import { ChatMember, Message, Update, User } from "typegram";
import fetch from "node-fetch";
import path from "path";

import {
  ChatLanguageCode,
  Ctx,
  EnryResponse,
  GuardPredicate,
  LocaleContainer,
} from "../types";
import { log } from "../logger";

export * as html from "./html";
export * from "./i18n";
export * from "./settings-keyboard";

export function noop() {}

/** Run Promise(s) w/o awaiting and log errors, if any */
export async function safePromiseAll(
  args: Promise<any> | Promise<any>[],
): Promise<void> {
  const results = await Promise.allSettled(Array.isArray(args) ? args : [args]);
  for (const result of results) {
    if (result.status === "rejected") {
      log.error("Error in ::safePromiseAll: %O", result.reason);
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

export function all<C extends TelegrafContext = Ctx>(
  ...predicates: GuardPredicate<C>[]
) {
  return (ctx: C) =>
    Promise.all(predicates.map(p => p(ctx))).then(results =>
      results.every(Boolean),
    );
}

export const dev = process.env.NODE_ENV === "development";

// export function getUserFromAnyMessage(message: Message): User | null {
//   if (message.new
// }
export function getCodeFromMessage(
  msg: Message.TextMessage,
): string | undefined {
  if (!msg.entities) return;
  const codeEntities = msg.entities.filter(
    e => e.type === "pre" || e.type === "code",
  );
  if (codeEntities.length !== 1) {
    // TODO:  Need to merge multiple entities into one
    return;
  }
  const { length, offset } = codeEntities[0];
  // Return only if the whole message is code
  if (offset === 0 && length === msg.text.length) {
    const codeSource = msg.text.slice(offset, offset + length);
    return codeSource;
  }
  return;
}

const OUT_OF_CHAT_STATUS: ChatMember["status"][] = ["left", "kicked"];
const IN_CHAT_STATUS: ChatMember["status"][] = [
  "member",
  "administrator",
  "creator",
];

export function getNewMembersFromUpdate(
  update: Update.ChatMemberUpdate | Update.MessageUpdate,
): User[] | undefined {
  if ("chat_member" in update) {
    const chatMember = update.chat_member;
    const oldMember = chatMember.old_chat_member;
    const newMember = chatMember.new_chat_member;
    if (
      OUT_OF_CHAT_STATUS.includes(oldMember.status) &&
      IN_CHAT_STATUS.includes(newMember.status)
    ) {
      return [newMember.user];
    }
  } else if ("new_chat_members" in update.message) {
    return update.message.new_chat_members;
  }
}

export function getLeftMemberFromUpdate(
  update: Update.ChatMemberUpdate | Update.MessageUpdate,
): User | undefined {
  if ("chat_member" in update) {
    const chatMember = update.chat_member;
    const oldMember = chatMember.old_chat_member;
    const newMember = chatMember.new_chat_member;
    if (
      IN_CHAT_STATUS.includes(newMember.status) &&
      OUT_OF_CHAT_STATUS.includes(oldMember.status)
    ) {
      return newMember.user;
    }
  } else if ("left_chat_member" in update.message) {
    return update.message.left_chat_member;
  }
}

export async function runTreeSitterHighlight(
  lang: string,
  code: string,
): Promise<NodeJS.ReadableStream | undefined> {
  const hlServerUrl = new URL(process.env.TREE_SITTER_SERVER_HOST!);
  hlServerUrl.searchParams.append("lang", lang);
  log.info(hlServerUrl);
  const response = await fetch(hlServerUrl, {
    method: "POST",
    body: code,
  });
  log.info(
    "Tree-sitter-highlight status %d (%s)",
    response.status,
    response.statusText,
  );
  if (response.status === 200) {
    return response.body;
  }
}

export async function runEnry(code: string): Promise<EnryResponse | undefined> {
  const response = await fetch(process.env.ENRY_SERVER_HOST!, {
    method: "POST",
    body: code,
  });
  if (!response.ok) return;
  return response.json();
}

export async function uploadToGist(
  info: EnryResponse,
  sourceCode: string,
): Promise<string | undefined> {
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
  log.info("Gist response: %d (%s)", response.status, response.statusText);
  if (!response.ok) {
    return;
  }
  try {
    const responseJson = await response.json();
    return `${responseJson.html_url}#file-${fileStem}-${extension}`;
  } catch {
    return;
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
    log.info("Loaded \"%s\" locale (%s)", localeName, file);
  }
  return result;
}

/** If user is CAS banned, returns link to the report */
export async function checkCASban(userId: number): Promise<string | undefined> {
  try {
    const url = new URL("https://api.cas.chat/check");
    url.searchParams.append("user_id", userId.toString());
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return;
    }
    const { ok } = (await response.json()) as { ok: boolean };
    if (ok) {
      return `https://cas.chat/query?u=${userId}`;
    }
  } catch (err) {
    log.error("Error in ::checkCASban:", err);
    return;
  }
}

export function secondsToHumanReadable(seconds: number): string {
  const mins = ~~(seconds / 60);
  const secs = seconds % 60;
  let result = "";
  if (secs > 0) {
    result += `${secs}s`;
  }
  if (mins > 0) {
    result = `${mins}m ${result}`;
  }
  return result;
}

export function joinLines(...lines: (string | number)[]) {
  return lines.join("\n");
}

export function isChannelComment(message: Message.CommonMessage) {
  return message.reply_to_message?.sender_chat?.type === "channel";
}
