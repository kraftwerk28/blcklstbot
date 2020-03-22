import { ContextMessageUpdate } from 'telegraf';
import { User, Message } from 'telegraf/typings/telegram-types';
import * as utils from './utils';
import * as api from './api';

export function mention(u: User, link = false, includeLastName = true) {
  if (u.username) {
    return `@${u.username}`;
  }
  let text = u.first_name;
  if (includeLastName && u.last_name) {
    text += ` ${u.last_name}`;
  }
  if (link) {
    return `<a href="tg://user?id=${u.id}">${text}</a>`;
  }
}

export function runAll(...funcs: Promise<any>[]) {
  return (Promise as any).allSettled(funcs);
}

export async function iAmAdmin(ctx: ContextMessageUpdate) {
  const { telegram: tg } = ctx;
  const { id } = await tg.getMe();
  const { can_restrict_members, can_delete_messages } = await tg.getChatMember(
    ctx.chat!.id,
    id
  );
  return can_restrict_members && can_delete_messages;
}

export async function checkUser(ctx: ContextMessageUpdate) {
  const { from } = ctx;
  if (!from) return;
  const isBanned = await api.checkUser(from.id);
  if (isBanned) {

  }
}

export async function kickUser(
  ctx: ContextMessageUpdate,
  reportedMsg: Message,
  reportMsg?: Message,
  globalBanlist = true
) {
  const { chat, telegram: tg } = ctx;
  const { id, first_name, last_name, username } = reportedMsg.from!;
  const reporter = reportMsg?.from!;
  if (globalBanlist) {
    const reportRecord = {
      id,
      first_name,
      last_name,
      username,
      message: reportedMsg.text!,
    } as Record<string, any>;
    if (reportMsg) {
      reportRecord.reason =
        `Reported by ${utils.mention(reporter)} (${reporter.id}).`;
    }
    await api.addUser(reportRecord);
  }

  await tg.kickChatMember(chat!.id, reportedMsg.from!.id);
}
