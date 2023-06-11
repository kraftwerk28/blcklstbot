import { User, Message, Chat, BotCommand } from "typegram";
import { Markup, Telegraf } from "telegraf";

import * as utils from "./utils";
import { Ctx, BanInfo } from "./types";
import { log } from "./logger";
import botConfig from "../bot.config.json";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;");
}

export function anchorLink(url: string, text: string) {
  return `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`;
}

export function userFullName(user: User) {
  return user.first_name + (user.last_name ? ` ${user.last_name}` : "");
}

export function userMention(user: User, disableUsername = false) {
  if (user.username && !disableUsername) {
    return `@${user.username}`;
  } else {
    return anchorLink(`tg://user?id=${user.id}`, userFullName(user));
  }
}

// export function mention(u: User, link = false, includeLastName = true) {
//   let text = '';
//   if (u.username) {
//     text += `@${u.username}`;
//   } else {
//     text += u.first_name;
//     if (includeLastName && u.last_name) {
//       text += ` ${u.last_name}`;
//     }
//   }
//   text = escapeHtml(text);

//   return link ? `<a href="tg://user?id=${u.id}">${text}</a>` : text;
// }

// export async function runAll(...funcs: (Promise<any> | undefined)[]) {
//   return await (Promise as any).allSettled(
//     funcs.map((f) => f || Promise.resolve(f))
//   );
// }

export async function iAmAdmin(ctx: Ctx): Promise<boolean> {
  const { tg } = ctx;
  if (!ctx.chat) {
    return false;
  }
  const meMember = await tg.getChatMember(ctx.chat.id, ctx.botInfo.id);
  return Boolean(meMember.can_restrict_members && meMember.can_delete_messages);
}

export async function checkAdmin(ctx: Ctx): Promise<boolean> {
  const { chat, from } = ctx;
  if (!(chat && from)) return false;
  const admins = await ctx.getChatAdministrators();
  return admins.some((cm) => cm.user.id === from.id);
}

export async function checkUser(ctx: Ctx) {
  const { chat, message, from, api } = ctx;
  if (!(chat && message && from)) return;

  const isBanned = await api.checkUser(from.id);
  if (isBanned) {
    await ctx.deleteMessage().catch();
    await utils.kickUser(
      ctx,
      chat,
      from,
      BanReason.Autoban,
      false,
      undefined,
      message,
    );
  }
}

export enum BanReason {
  Report,
  Voteban,
  Autoban,
}

export async function kickUser(
  ctx: Ctx,
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
  const kickedUserMention = userMention(reportedUser);

  if (globalBanlist) {
    const { id: telegram_id, first_name, last_name, username } = reportedUser;

    const reportRecord = {
      telegram_id,
      first_name,
      last_name,
      username,
    } as BanInfo;

    if (reportedMsg && "text" in reportedMsg) {
      reportRecord.message = reportedMsg.text;
    }

    if (reportMsg) {
      reportRecord.reason =
        `Reported by ${userFullName(reporter)}` + ` (${reporter.id})`;
    } else {
      reportRecord.reason = "User existed previously in Blocklist DB";
    }

    await api.addUser(reportRecord);
  }

  const unbanMarkupBtns = [];
  unbanMarkupBtns.push(Markup.button.callback("U2b05Ufe0f Undo", "unban"));

  // If specified message had been reported,
  // we add a button with link to it (to channel)
  if (reportedMsg) {
    // const { reportsChannelUsername } = ctx;
    // const fwd = await tg.forwardMessage(
    //   ctx.reportsChannelID,
    //   chat.id,
    //   reportedMsg.message_id,
    //   { disable_notification: true }
    // ).catch(() => null);
    // if (fwd) {
    //   const refButton = Markup.urlButton(
    //     '\u{1f5d2}\ufe0f Message',
    //     `https://t.me/${reportsChannelUsername}/${fwd.message_id}`
    //   );
    //   unbanMarkupBtns.push(refButton);
    // }
  }

  // This button deletes report result message
  unbanMarkupBtns.push(Markup.button.callback("U274c Delete", "deleteMessage"));

  await tg
    .kickChatMember(chat.id, reportedUser.id, Date.now() + 15 * 6e4)
    .catch();

  let reasonText = "";
  if (reason === BanReason.Autoban) {
    reasonText = `Banned ${kickedUserMention} because they were previously reported.`;
  } else if (reason === BanReason.Voteban) {
    reasonText = `Banned ${kickedUserMention} because of voting results.`;
  } else if (reason === BanReason.Report) {
    reasonText = `${userMention(reporter)} banned ${kickedUserMention}.`;
  }

  const inlineKbd = Markup.inlineKeyboard(unbanMarkupBtns);

  const banResultMsg = await tg.sendMessage(chat.id, reasonText, {
    reply_markup: inlineKbd.reply_markup,
    parse_mode: "HTML",
  });

  banned.set(banResultMsg.message_id, {
    chatId: chat.id,
    userId: reportedUser.id,
    resultMsgId: banResultMsg.message_id,
  });
}

export function getReportedUser(ctx: Ctx): User | undefined {
  const reply = (ctx.message as Message.CommonMessage).reply_to_message;
  if (reply) {
    const newMembers =
      (reply as Message.NewChatMembersMessage).new_chat_members || [];
    return newMembers.length ? newMembers[0] : reply.from;
  }
}

export function parseCommands(): BotCommand[] {
  return Object.entries(botConfig.commands).map(([command, description]) => ({
    command,
    description,
  }));
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

export function isDev() {
  return process.env.NODE_ENV === "development";
}

export async function flushUpdates(bot: Telegraf<Ctx>) {
  await bot.telegram.deleteWebhook();
  let update = await bot.telegram.callApi("getUpdates", { offset: -1 });
  console.log(update);
  // let lastUpdateId = 0;
  // while (true) {
  //   const updates = await bot.telegram.callApi(
  //     'getUpdates',
  //     { offset: lastUpdateId },
  //   );
  //   if (updates.length > 0) {
  //     lastUpdateId = updates.slice(-1)[0].update_id + 1;
  //     log.info('Fetched old updates (%O)', lastUpdateId);
  //   } else {
  //     break;
  //   }
  // }
}

export function randInt(a: number, b?: number) {
  if (b === undefined) {
    return Math.floor(Math.random() * a);
  } else {
    return b + Math.floor(Math.random() * (b - a));
  }
}
