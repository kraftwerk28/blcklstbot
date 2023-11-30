import { ChatMember, ChatMemberRestricted } from "grammy/types";
import { Composer } from "../composer.js";
import { parse, stringify } from "../duration.js";
import { botHasSufficientPermissions, senderIsAdmin } from "../guards/index.js";
import { DbUser } from "../types/index.js";
import { userInfoWithouMention } from "../utils/html.js";
import { noop } from "../utils/index.js";
import obtainReportedUser from "./get-reported-user.js";
import splitArgs from "./split-args.js";

type PermissionSet = Omit<
  ChatMemberRestricted,
  "user" | "is_member" | "status" | "until_date"
>;

const extractPermissions = (cm: ChatMember): PermissionSet => {
  if (cm.status === "restricted") {
    const { user, is_member, status, until_date, ...permissions } = cm;
    return permissions;
  }
  // NOTE: "administrator" is not handled
  return {
    can_send_messages: true,
    can_send_audios: true,
    can_send_documents: true,
    can_send_photos: true,
    can_send_videos: true,
    can_send_video_notes: true,
    can_send_voice_notes: true,
    can_send_polls: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true,
    can_change_info: true,
    can_invite_users: true,
    can_pin_messages: true,
    can_manage_topics: true,
  };
};

const makeEventHash = (chatId: number, userId: number) =>
  `mute:${chatId}:${userId}`;

const composer = new Composer();

export default composer;

const composer2 = composer.chatType(["group", "supergroup"]);

composer2
  .command("mute", splitArgs)
  .filter(senderIsAdmin)
  .use(obtainReportedUser)
  .use(async (ctx, next) => {
    if (!ctx.reportedUser) return next();
    const durationStr = ctx.commandArgs.shift();
    if (!durationStr) return next();
    let durationSeconds: number;
    try {
      durationSeconds = parse(durationStr);
    } catch {
      return;
    }
    const {
      id: user_id,
      chat_id,
      mute_duration,
      saved_permissions,
    } = ctx.reportedUser;
    const reportedChatMember = await ctx.getChatMember(user_id);
    if (reportedChatMember.status !== "member") {
      return;
    }
    await ctx.dbStore.updateUser({
      id: user_id,
      chat_id,
      mute_duration: durationSeconds,
    });
    if (mute_duration != null) {
      await ctx.eventQueue.removeEvent(makeEventHash(chat_id, user_id));
      await ctx
        .restrictChatMember(user_id, {
          ...saved_permissions,
          can_send_messages: true,
        })
        .catch(noop);
    }
    const text = `Mute duration for ${userInfoWithouMention(
      ctx.reportedUser,
    )} is set to ${stringify(durationSeconds)}.`;
    await ctx.reply(text, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message.message_id,
    });
  });

composer2
  .command("unmute", splitArgs)
  .filter(senderIsAdmin)
  .use(obtainReportedUser)
  .use(async (ctx) => {
    if (!ctx.reportedUser || ctx.reportedUser.mute_duration == null) return;
    const { id: user_id, chat_id, saved_permissions } = ctx.reportedUser;
    await ctx.dbStore.updateUser({
      id: user_id,
      chat_id: chat_id,
      mute_duration: null,
    });
    await ctx.eventQueue.removeEvent(makeEventHash(chat_id, user_id));
    await ctx
      .restrictChatMember(user_id, {
        ...saved_permissions,
        can_send_messages: true,
      })
      .catch(noop);
    await ctx.reply(
      `Mute time for ${userInfoWithouMention(ctx.reportedUser)} is unset.`,
      {
        parse_mode: "HTML",
        reply_to_message_id: ctx.message.message_id,
      },
    );
  });

composer2
  .command("mute_list", splitArgs)
  .filter(senderIsAdmin)
  .use(async (ctx) => {
    const { knex } = ctx.dbStore;
    const mutedUsers = await knex<DbUser>("users")
      .where({ chat_id: ctx.chat.id })
      .whereNotNull("mute_duration");
    if (!mutedUsers.length) {
      return ctx.reply(ctx.t("mute_list_empty"), {
        reply_to_message_id: ctx.message.message_id,
      });
    }
    const listStr = mutedUsers
      .map((u) => `${userInfoWithouMention(u)}: ${stringify(u.mute_duration!)}`)
      .join("\n");
    await ctx.reply(`<b>Mute list:</b>\n\n${listStr}`, {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: "HTML",
    });
  });

composer2
  .on("message")
  .filter((ctx) => ctx.dbUser.mute_duration != null)
  .filter(botHasSufficientPermissions)
  .use(async (ctx, next) => {
    const { id: user_id, chat_id, mute_duration } = ctx.dbUser;
    const currentChatMember = await ctx.getChatMember(user_id);
    await ctx.dbStore.updateUser({
      id: user_id,
      chat_id,
      saved_permissions: extractPermissions(currentChatMember),
    });
    await ctx
      .restrictChatMember(user_id, {
        can_send_messages: false,
      })
      .catch(noop);
    await ctx.eventQueue.pushDelayed(
      mute_duration!,
      "unmute",
      { user_id, chat_id },
      makeEventHash(user_id, chat_id),
    );
    return next();
  });
