import { Composer } from "../composer.js";
import { parse, stringify } from "../duration.js";
import { botHasSufficientPermissions, senderIsAdmin } from "../guards/index.js";
import { DbUser } from "../types/index.js";
import { userFullName, userMention } from "../utils/html.js";
import { noop } from "../utils/index.js";
import obtainReportedUser from "./get-reported-user.js";
import splitArgs from "./split-args.js";

const composer = new Composer();

export default composer;

const composer2 = composer
  .chatType(["group", "supergroup"])
  .use(botHasSufficientPermissions);

composer2.use(async (ctx, next) => {
  if (ctx.dbUser.mute_duration == null) return next();
  const { id: user_id, chat_id } = ctx.dbUser;
  const eventHash = `mute:${chat_id}:${user_id}`;
  await ctx.eventQueue.pushDelayed(
    ctx.dbUser.mute_duration,
    "unmute",
    { user_id, chat_id },
    eventHash,
  );
  await ctx
    .restrictChatMember(ctx.dbUser.id, {
      can_send_messages: false,
      can_send_other_messages: false,
    })
    .catch(noop);
  return next();
});

composer2.command(
  "mute",
  splitArgs,
  senderIsAdmin,
  obtainReportedUser,
  async (ctx, next) => {
    if (!ctx.reportedUser) return next();
    const durationStr = ctx.commandArgs.shift();
    if (!durationStr) return next();
    let durationSeconds: number;
    try {
      durationSeconds = parse(durationStr);
    } catch {
      return next();
    }
    await ctx.dbStore.updateUser({
      id: ctx.reportedUser.id,
      chat_id: ctx.reportedUser.chat_id,
      mute_duration: durationSeconds,
    });
    await ctx.reply(
      `Mute duration for ${userMention(ctx.reportedUser)} is set to ${stringify(
        durationSeconds,
      )}.`,
      { parse_mode: "HTML", reply_to_message_id: ctx.message.message_id },
    );
  },
);

composer2.command(
  "unmute",
  splitArgs,
  obtainReportedUser,
  senderIsAdmin,
  async (ctx, next) => {
    if (!ctx.reportedUser) return next();
    await ctx.dbStore.updateUser({
      id: ctx.reportedUser.id,
      chat_id: ctx.reportedUser.chat_id,
      mute_duration: null,
    });
    const eventHash = `mute:${ctx.reportedUser.chat_id}:${ctx.reportedUser.id}`;
    await ctx.eventQueue.removeEvent(eventHash);
    await ctx
      .restrictChatMember(ctx.reportedUser.id, {
        can_send_messages: true,
        can_send_other_messages: true,
      })
      .catch(noop);
    await ctx.reply(
      `Mute time for ${userMention(ctx.reportedUser)} is unset.`,
      {
        parse_mode: "HTML",
        reply_to_message_id: ctx.message.message_id,
      },
    );
  },
);

composer2.command("mute_list", senderIsAdmin, async (ctx) => {
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
    .map((u) => `${userFullName(u)} — ${stringify(u.mute_duration!)}`)
    .join("\n");
  await ctx.reply(`<b>Mute list:</b>\n\n${listStr}`, {
    reply_to_message_id: ctx.message.message_id,
    parse_mode: "HTML",
  });
});
