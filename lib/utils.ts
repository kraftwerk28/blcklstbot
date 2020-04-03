import { ContextMessageUpdate, Markup } from 'telegraf';
import { User, Message, Chat } from 'telegraf/typings/telegram-types';
import * as utils from './utils';

export function mention(u: User, link = false, includeLastName = true) {
  if (u.username) {
    return `@${u.username}`;
  }
  let text = u.first_name;
  if (includeLastName && u.last_name) {
    text += ` ${u.last_name}`;
  }
  return link ? `<a href="tg://user?id=${u.id}">${text}</a>` : text;
}

export async function runAll(...funcs: (Promise<any> | undefined)[]) {
  return await (Promise as any).allSettled(
    funcs.map((f) => f || Promise.resolve(f))
  );
}

export async function iAmAdmin(ctx: ContextMessageUpdate) {
  const { telegram: tg } = ctx;
  const { id } = await tg.getMe();
  const m = await tg.getChatMember(ctx.chat!.id, id);
  return m.can_restrict_members && m.can_delete_messages;
}

export async function checkAdmin(ctx: ContextMessageUpdate): Promise<boolean> {
  const { chat, from } = ctx;
  if (!(chat && from)) return false;
  const admins = await ctx.getChatAdministrators();
  return admins.some((cm) => cm.user.id === from.id);
}

export async function checkUser(ctx: ContextMessageUpdate) {
  const { chat, message, from, api } = ctx;
  if (!(chat && message && from)) return;

  const isBanned = await api.checkUser(from.id);
  if (isBanned) {
    await ctx.deleteMessageWeak(chat.id, message.message_id);
    await utils.kickUser(ctx, chat, from, message, undefined, false);
  }
}

export async function kickUser(
  ctx: ContextMessageUpdate,
  chat: Chat,
  reportedUser: User,
  reportMsg: Message,
  reportedMsg?: Message,
  globalBanlist = true
) {
  const { telegram: tg, banned, api } = ctx;
  const reporter = reportMsg?.from!;

  if (globalBanlist) {
    const { id, first_name, last_name, username } = reportedUser;
    const reportRecord = {
      id,
      first_name,
      last_name,
      username,
    } as Record<string, any>;
    if (reportedMsg) {
      reportRecord.message = reportedMsg.text;
    }
    if (reportMsg) {
      reportRecord.reason = `Reported by ${utils.mention(reporter)} (${
        reporter.id
      })`;
    }
    await api.addUser(reportRecord);
  }

  await tg
    .kickChatMember(chat.id, reportedUser.id, Date.now() + 15 * 6e4)
    .catch();
  const unbanMarkup = Markup.inlineKeyboard([
    Markup.callbackButton('⬅️ Undo ban', 'unban'),
    Markup.callbackButton('️❌ Delete this message', 'deleteMessage'),
  ]);

  const banResultMsg = await tg.sendMessage(
    chat.id,
    `Kicked ${mention(reportedUser)}.`,
    { reply_markup: unbanMarkup }
  );

  banned.set(banResultMsg.message_id, {
    chatId: chat.id,
    userId: reportedUser.id,
    resultMsgId: banResultMsg.message_id,
  });
}

export function getReportedUser(ctx: ContextMessageUpdate): User | undefined {
  const { message: { reply_to_message: r } = {} } = ctx;
  if (!r) return;
  return r.new_chat_members?.length ? r.new_chat_members[0] : r.from;
}
