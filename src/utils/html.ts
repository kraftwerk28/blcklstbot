import { MessageEntity } from "typegram";
import { MentionableUser } from "../types";

export function bold(text: string) {
  return "<b>" + text + "</b>";
}

export function italic(text: string) {
  return "<i>" + text + "</i>";
}

export function code(text: string | number) {
  return "<code>" + text + "</code>";
}

export function link(url: string, text: string) {
  return `<a href="${escape(url)}">${escape(text)}</a>`;
}

export function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function userFullName(user: MentionableUser) {
  return user.first_name + (user.last_name ? ` ${user.last_name}` : "");
}

export function userMention(user: MentionableUser, preferUsername = true) {
  if (preferUsername && user.username) {
    return "@" + user.username;
  }
  return link(`tg://user?id=${user.id}`, userFullName(user));
}

const ENTITY_TYPE_TAGS: { [K in MessageEntity["type"]]?: string } = {
  bold: "b",
  italic: "i",
  underline: "u",
  strikethrough: "s",
  code: "code",
  pre: "pre",
};

export function applyHtmlEntities(raw: string, entities: MessageEntity[]) {
  let result = raw;
  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    let tagStart: string, tagEnd: string;
    if (entity.type === "text_link") {
      tagStart = `<a href="${entity.url}">`;
      tagEnd = "<a>";
    } else if (entity.type in ENTITY_TYPE_TAGS) {
      const tagStr = ENTITY_TYPE_TAGS[entity.type];
      tagStart = `<${tagStr}>`;
      tagEnd = `</${tagStr}>`;
    } else {
      continue;
    }
    const { offset, length } = entity;
    result =
      result.slice(0, offset) +
      tagStart +
      result.slice(offset, offset + length) +
      tagEnd +
      result.slice(offset + length);
  }
  return result;
}
