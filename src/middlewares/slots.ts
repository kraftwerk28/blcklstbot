import { Composer } from "grammy";
import { Context, DbBalanceTrx } from "../types/index.js";
import { QueryResult } from "pg";
import { extractPermissions } from "./muter.js";

const composer = new Composer<Context>();

export default composer;

// const WIN_MASK = [0b000000, 0b010101, 0b101010, 0b111111];

const c2 = composer.filter(
  (ctx) => ctx.dbChat !== undefined && ctx.dbChat.enable_slots,
);

const setInitialBalanceMiddleware = new Composer<Context>();

const INITIAL_BALANCE = 20;

setInitialBalanceMiddleware.use(async (ctx, next) => {
  if (!ctx.dbUser) return;
  const { id: user_id } = ctx.dbUser;
  await ctx.dbStore.knex.raw(
    `
      insert into "balance_trx" (user_id, diff, current_balance)
      select :user_id, :diff, :diff
      where not exists (
        select id from "balance_trx"
        where user_id = :user_id
      )
    `,
    { user_id, diff: INITIAL_BALANCE },
  );
  return next();
});

c2.on("message:dice")
  .filter((ctx) => ctx.msg.dice.emoji === "🎰")
  .use(setInitialBalanceMiddleware)
  .use(async (ctx, next) => {
    // TODO: add a 2 second delay, to allow animation to run
    if (!ctx.dbUser) return next();

    const lastTrx = await ctx.dbStore
      .knex<DbBalanceTrx>("balance_trx")
      .where({ user_id: ctx.dbUser.id })
      .orderBy("timestamp", "desc")
      .first();

    if (!lastTrx) throw new Error("Unreachable");

    // /** Emoji on which the dice throw animation is based */
    // emoji: string;
    // /** Value of the dice, 1-6 for "🎲", "🎯" and "🎳" base emoji, 1-5 for "🏀" and "⚽" base emoji, 1-64 for "🎰" base emoji */

    // value: number;
    // :bar:   = 0b00
    // :berry: = 0b01
    // :lemon: = 0b10
    // :seven: = 0b11
    // For example: bar - berry - lemon = 0b100100 + 1 (order reversed) = 37
    // For example: lemon - bar - bar = 0b000010 + 1 (order reversed) = 3

    // Suppose:
    // Chance or winning = 4/64 = 1/16
    // Therefore, if wager = 1, win should be 16 for RTP = 100%

    if (lastTrx.current_balance <= 0) {
      await ctx.deleteMessage();
      return;
    }

    // With the following distribution, player wins 62 points for 64 bets in
    // average, RTP = 96.875%
    let diff = 0;
    switch (ctx.msg.dice.value) {
      case 0b111111 + 1:
        diff = 50;
        await ctx.reply(ctx.t("slot_jp", { amount: diff }), {
          reply_parameters: { message_id: ctx.msg.message_id },
        });
        break;
      case 0b000000 + 1:
      case 0b010101 + 1:
      case 0b101010 + 1:
        diff = 4;
        await ctx.reply(ctx.t("slot_win", { amount: diff }), {
          reply_parameters: { message_id: ctx.msg.message_id },
        });
        break;
      default:
        diff = -1;
        break;
    }
    const newBalance = lastTrx.current_balance + diff;
    await ctx.dbStore.knex<DbBalanceTrx>("balance_trx").insert({
      user_id: ctx.dbUser.id,
      dice_emoji: ctx.msg.dice.emoji,
      dice_value: ctx.msg.dice.value,
      diff,
      current_balance: newBalance,
    });
    if (newBalance <= 0) {
      await ctx.reply(ctx.t("slot_empty_wallet", { amount: INITIAL_BALANCE }));
      try {
        const permissions = extractPermissions(
          await ctx.getChatMemberCached(ctx.dbUser.id),
        );
        await ctx.restrictChatMember(
          ctx.dbUser.id,
          {
            ...permissions,
            can_send_other_messages: false,
          },
          { use_independent_chat_permissions: true },
        );
      } catch (err) {
        ctx.log.error(err);
      }
    }
  });

c2.command("balance", async (ctx, next) => {
  if (!ctx.dbUser) return next();
  const { id: user_id } = ctx.dbUser;

  const lastTrx = await ctx.dbStore
    .knex<DbBalanceTrx>("balance_trx")
    .where({ user_id })
    .orderBy("timestamp", "desc")
    .first();

  if (!lastTrx)
    return ctx.reply(ctx.t("slot_no_spins", { amount: INITIAL_BALANCE }), {
      reply_parameters: { message_id: ctx.msg.message_id },
    });

  const { rows: totalValues } = await ctx.dbStore.knex.raw<
    QueryResult<{ total: number }>
  >(
    `
      select coalesce(sum(diff), 0) as "total"
      from "balance_trx"
      where user_id = :user_id and diff > 0 and dice_value is not null
      union all
      select coalesce(sum(diff), 0)
      from "balance_trx"
      where user_id = :user_id and diff < 0 and dice_value is not null
    `,
    { user_id },
  );

  return ctx.reply(
    ctx.t("slot_current_balance", {
      balance: lastTrx.current_balance,
      win: totalValues[0]!.total,
      wager: totalValues[1]!.total,
    }),
    {
      reply_parameters: {
        message_id: ctx.msg.message_id,
      },
    },
  );
});

c2.command("slot_rules", async (ctx) => {
  const { message_id } = ctx.msg;
  return ctx.reply(ctx.t("slot_rules"), { reply_parameters: { message_id } });
});

c2.command("tumbochka", async (ctx, next) => {
  if (!ctx.dbUser) return next();
  const lastTrx = await ctx.dbStore
    .knex<DbBalanceTrx>("balance_trx")
    .where({ user_id: ctx.dbUser.id })
    .orderBy("timestamp", "desc")
    .first();
  if (!lastTrx || lastTrx.current_balance > 0) return;
  await ctx.dbStore.knex<DbBalanceTrx>("balance_trx").insert({
    user_id: ctx.dbUser.id,
    diff: INITIAL_BALANCE,
    current_balance: lastTrx.current_balance + INITIAL_BALANCE,
  });
  try {
    const permissions = extractPermissions(
      await ctx.getChatMemberCached(ctx.dbUser.id),
    );
    await ctx.restrictChatMember(
      ctx.dbUser.id,
      {
        ...permissions,
        can_send_other_messages: true,
      },
      { use_independent_chat_permissions: true },
    );
  } catch (err) {
    ctx.log.error(err);
  }
  return ctx.reply(ctx.t("slot_filled_by", { amount: INITIAL_BALANCE }), {
    reply_parameters: {
      message_id: ctx.msg.message_id,
    },
  });
});
