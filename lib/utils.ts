import fs from 'fs';
import path from 'path';
import { ContextMessageUpdate, Markup, Command, Button } from 'telegraf';
import { User, Message, Chat } from 'telegraf/typings/telegram-types';
import * as utils from './utils';
import { BanInfo } from './api';
import botConfig from '../bot.config.json';

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

export async function iAmAdmin(ctx: ContextMessageUpdate): Promise<boolean> {
  const { telegram: tg } = ctx;
  const { id } = await tg.getMe();
  const m = await tg.getChatMember(ctx.chat!.id, id);
  return Boolean(m.can_restrict_members && m.can_delete_messages);
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
    await utils.kickUser(
      ctx,
      chat,
      from,
      BanReason.AUTOBAN,
      false,
      undefined,
      message,
    );
  }
}

export enum BanReason {
  REPORT,
  VOTEBAN,
  AUTOBAN,
}

export async function kickUser(
  ctx: ContextMessageUpdate,
  chat: Chat,
  reportedUser: User,
  reason: BanReason,
  globalBanlist = true,
  /** Usually a message with `/report` command */
  reportMsg?: Message,
  /** The message from user which has to be banned */
  reportedMsg?: Message,
) {
  const { telegram: tg, banned, api } = ctx;
  const reporter = reportMsg?.from!;
  const kickedUserMention = mention(reportedUser, true);

  if (globalBanlist) {
    const { id: telegram_id, first_name, last_name, username } = reportedUser;

    const reportRecord = {
      telegram_id,
      first_name,
      last_name,
      username,
    } as BanInfo;

    if (reportedMsg?.text) {
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
  unbanMarkupBtns.push(Markup.callbackButton('\u2b05\ufe0f Undo', 'unban'));

  // If specified message had been reported,
  // we add a button with link to it (to channel)
  if (reportedMsg) {
    const { reportsChannelUsername } = ctx;
    const fwd = await tg.forwardMessage(
      ctx.reportsChannelID,
      chat.id,
      reportedMsg.message_id,
      { disable_notification: true }
    ).catch(() => null);

    if (fwd) {
      const refButton = Markup.urlButton(
        '\u{1f5d2}\ufe0f Message',
        `https://t.me/${reportsChannelUsername}/${fwd.message_id}`
      );
      unbanMarkupBtns.push(refButton);
    }
  }

  // This button deletes report result message
  unbanMarkupBtns.push(Markup.callbackButton('\u274c Delete', 'deleteMessage'));

  await tg
    .kickChatMember(chat.id, reportedUser.id, Date.now() + 15 * 6e4)
    .catch();

  let reasonText = '';
  if (reason === BanReason.AUTOBAN) {
    reasonText = `Banned ${kickedUserMention} because they were previously reported.`;
  } else if (reason === BanReason.VOTEBAN) {
    reasonText = `Banned ${kickedUserMention} because of voting results.`;
  } else if (reason === BanReason.REPORT) {
    reasonText = `${mention(reporter)} banned ${kickedUserMention}.`;
  }

  const banResultMsg = await tg.sendMessage(
    chat.id,
    reasonText,
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
  return Object
    .entries(botConfig.commands)
    .map(([command, description]) => ({ command, description }));
  // const commandsContent = fs.readFileSync(
  //   path.resolve(__dirname, '../commands.txt'),
  //   'utf-8'
  // );
  // return commandsContent
  //   .split('\n')
  //   .filter((s) => s.trim().length)
  //   .map((s) => {
  //     const [command, description] = s.split('-').map((s) => s.trim());
  //     return { command, description };
  //   });
}
