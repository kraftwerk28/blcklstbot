import fs from 'fs';
import path from 'path';
import { ContextMessageUpdate, Markup, Command } from 'telegraf';
import { User, Message, Chat } from 'telegraf/typings/telegram-types';
import * as utils from './utils';
import { BanInfo } from './api';

export function mention(u: User, link = false, includeLastName = true) {
  let text = '';
  if (u.username) {
    text += `@${u.username}`;
  } else {
    text += u.first_name;
    if (includeLastName && u.last_name) {
      text += ` ${u.last_name}`;
    }
  }
  text = escapeHtml(text);

  return link ? `<a href="tg://user?id=${u.id}">${text}</a>` : text;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
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
    const { id: telegram_id, first_name, last_name, username } = reportedUser;

    const reportRecord = {
      telegram_id,
      first_name,
      last_name,
      username,
    } as BanInfo;

    if (reportedMsg && reportedMsg.text) {
      reportRecord.message = reportedMsg.text;
    }

    if (reportMsg) {
      reportRecord.reason = `Reported by ${utils.mention(reporter)} (${
        reporter.id
      })`;
    } else {
      reportRecord.reason = 'User existed previously in Blocklist DB';
    }

    await api.addUser(reportRecord);
  }

  const unbanMarkupBtns = [];
  unbanMarkupBtns.push(Markup.callbackButton('⬅️ Undo', 'unban'));
  if (reportedMsg) {
    const { reportsChannelUsername } = ctx;
    const fwd = await tg.forwardMessage(
      ctx.reportsChannelID,
      chat.id,
      reportedMsg.message_id,
      { disable_notification: true }
    );
    unbanMarkupBtns.push(
      Markup.urlButton(
        '🗒 Message',
        `https://t.me/${reportsChannelUsername}/${fwd.message_id}`
      )
    );
  }
  unbanMarkupBtns.push(Markup.callbackButton('️❌ Delete', 'deleteMessage'));

  await tg
    .kickChatMember(chat.id, reportedUser.id, Date.now() + 15 * 6e4)
    .catch();

  const banResultMsg = await tg.sendMessage(
    chat.id,
    `Kicked ${mention(reportedUser, true)}.`,
    {
      reply_markup: Markup.inlineKeyboard(unbanMarkupBtns as any),
      parse_mode: 'HTML',
    }
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

export function parseCommands(): Command[] {
  const commandsContent = fs.readFileSync(
    path.resolve(__dirname, '../../commands.txt'),
    'utf-8'
  );
  return commandsContent
    .split('\n')
    .filter((s) => s.trim().length)
    .map((s) => {
      const [command, description] = s.split('-').map((s) => s.trim());
      return { command, description };
    });
}
