import { User } from 'typegram';

export function bold(text: string) {
  return '<b>' + text + '</b>';
}

export function italic(text: string) {
  return '<i>' + text + '</i>';
}

export function code(text: string) {
  return '<code>' + text + '</code>'
}

export function link(url: string, text: string) {
  return `<a href="${escape(url)}">${escape(text)}</a>`;
}

export function escape(text: string): string {
  return text.replace('&', '&amp').replace('<', '&lt;').replace('>', '&gt;');
}

export function userMention(user: User, preferUsername = true) {
  if (preferUsername && user.username) {
    return '@' + user.username;
  }
  let text = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
  return link(`tg://user?id="${user.id}"`, text);
}
