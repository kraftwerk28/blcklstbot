import { InlineKeyboard } from "grammy";
import { Composer } from "../composer.js";

import {
  CaptchaMode,
  ChatLanguageCode,
  GroupChatContext,
} from "../types/index.js";
import { senderIsAdmin } from "../guards/index.js";
import { noop } from "../utils/index.js";

const isEnabledEmoji = (b: boolean) => {
  // return b ? '\u2705' : '\u26d4';
  return b ? "\u2705" : "\u274c";
};

const LANGUAGE_FLAGS: Record<ChatLanguageCode, string> = {
  en: "🇬🇧",
  uk: "🇺🇦",
};

const reprSeconds = (s: number) => {
  let ret = "";
  const h = Math.floor(s / (60 * 60));
  s -= h * 60 * 60;
  if (h) ret += `${h}h`;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (m) ret += ` ${m}m`;
  if (s || !ret) ret += ` ${s}s`;
  return ret.trim();
};

const CAPTCHA_TIMEOUTS = [5, 10, 30, 60, 2 * 60, 3 * 60, 4 * 60, 5 * 60];

function findPrevNextTimIndex(timeout: number) {
  let prevTimIdx: number | undefined = 0;
  let nextTimIdx: number | undefined = 0;
  while (CAPTCHA_TIMEOUTS[prevTimIdx]! < timeout) {
    prevTimIdx++;
  }
  if (CAPTCHA_TIMEOUTS[prevTimIdx] === timeout) {
    nextTimIdx = prevTimIdx + 1;
  } else {
    nextTimIdx = prevTimIdx;
  }
  prevTimIdx--;
  if (prevTimIdx < 0) {
    prevTimIdx = undefined;
  }
  if (nextTimIdx >= CAPTCHA_TIMEOUTS.length) {
    nextTimIdx = undefined;
  }
  return [prevTimIdx, nextTimIdx] as const;
}

function buildSettingsKeyboard(ctx: GroupChatContext) {
  const { dbChat } = ctx;
  const captchaModeBtns = Object.values(CaptchaMode).map((mode) => {
    const en = isEnabledEmoji(dbChat.captcha_modes.includes(mode));
    return InlineKeyboard.text(`${en} ${mode}`, `toggle:captcha:${mode}`);
  });

  const [prevTimIdx, nextTimIdx] = findPrevNextTimIndex(dbChat.captcha_timeout);
  let prevText, nextText;
  if (prevTimIdx === undefined) {
    prevText = "🚫";
  } else {
    prevText =
      "-" + reprSeconds(dbChat.captcha_timeout - CAPTCHA_TIMEOUTS[prevTimIdx]!);
  }
  if (nextTimIdx === undefined) {
    nextText = "🚫";
  } else {
    nextText =
      "+" + reprSeconds(CAPTCHA_TIMEOUTS[nextTimIdx]! - dbChat.captcha_timeout);
  }
  const captchaTimeoutBtns = [
    InlineKeyboard.text(prevText, "captcha:dec"),
    InlineKeyboard.text(`Timeout: ${reprSeconds(dbChat.captcha_timeout)}`),
    InlineKeyboard.text(nextText, "captcha:inc"),
  ];

  const deleteJoinsBtn = InlineKeyboard.text(
    `${isEnabledEmoji(dbChat.delete_joins)} Delete join messages`,
    "toggle:delete_joins",
  );

  const uploadToGistBtn = InlineKeyboard.text(
    `${isEnabledEmoji(dbChat.upload_to_gist)} Upload code snippets to Gist`,
    "toggle:gist",
  );

  const languageBtns = Object.entries(LANGUAGE_FLAGS).map(
    ([code, flagEmoji]) => {
      let text = flagEmoji;
      if (code === dbChat.language_code) {
        text = "\u2705 " + text;
      }
      return InlineKeyboard.text(text, `set_lang:${code}`);
    },
  );

  return new InlineKeyboard([
    captchaModeBtns,
    captchaTimeoutBtns,
    [deleteJoinsBtn],
    [uploadToGistBtn],
    languageBtns,
    [InlineKeyboard.text(`${isEnabledEmoji(false)} Close`, "close")],
  ]);
}

const composer = new Composer();

const composer2 = composer.chatType(["group", "supergroup"]);

composer2
  .command("settings")
  .filter(senderIsAdmin)
  .use(async (ctx) => {
    return ctx.reply("Settings:", {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: buildSettingsKeyboard(ctx),
    });
  });

const cbQueryComposer = composer2
  .use(async (ctx, next) => {
    if (!ctx.callbackQuery) {
      return next();
    }
    const { from } = ctx.callbackQuery;
    const cm = await ctx.getChatMember(from.id);
    if (cm.status === "administrator" || cm.user.id === ctx.botCreatorId)
      return next();
    else return ctx.answerCallbackQuery(ctx.t("admin_only_action"));
  })
  .callbackQuery(/.+/, async (ctx, next) => {
    await next();
    try {
      await ctx.editMessageReplyMarkup({
        reply_markup: buildSettingsKeyboard(ctx),
      });
    } catch {
      // Noop
    }
    return ctx.answerCallbackQuery();
  });

cbQueryComposer.callbackQuery(/^toggle:captcha:(.+)$/, async (ctx) => {
  const modes = ctx.dbChat.captcha_modes.slice();
  const mode = ctx.match[1] as CaptchaMode;
  if (modes.includes(mode)) {
    modes.splice(modes.indexOf(mode), 1);
  } else {
    modes.push(mode);
  }
  ctx.dbChat = await ctx.dbStore.updateChatProp(
    ctx.chat.id,
    "captcha_modes",
    modes,
  );
});

cbQueryComposer.callbackQuery("captcha:dec", async (ctx) => {
  const { dbChat } = ctx;
  const [prevTimIdx] = findPrevNextTimIndex(dbChat.captcha_timeout);
  if (prevTimIdx === undefined) {
    return ctx.answerCallbackQuery();
  }
  ctx.dbChat = await ctx.dbStore.updateChatProp(
    ctx.chat.id,
    "captcha_timeout",
    CAPTCHA_TIMEOUTS[prevTimIdx]!,
  );
});

cbQueryComposer.callbackQuery("captcha:inc", async (ctx) => {
  const { dbChat } = ctx;
  const [_, nextTimIdx] = findPrevNextTimIndex(dbChat.captcha_timeout);
  if (nextTimIdx === undefined) {
    return ctx.answerCallbackQuery();
  }
  ctx.dbChat = await ctx.dbStore.updateChatProp(
    ctx.chat.id,
    "captcha_timeout",
    CAPTCHA_TIMEOUTS[nextTimIdx]!,
  );
});

cbQueryComposer.callbackQuery("toggle:delete_joins", async (ctx) => {
  ctx.dbChat = await ctx.dbStore.updateChatProp(
    ctx.chat.id,
    "delete_joins",
    !ctx.dbChat.delete_joins,
  );
});

cbQueryComposer.callbackQuery("toggle:gist", async (ctx) => {
  ctx.dbChat = await ctx.dbStore.updateChatProp(
    ctx.chat.id,
    "upload_to_gist",
    !ctx.dbChat.upload_to_gist,
  );
});

cbQueryComposer.callbackQuery(/^set_lang:(\w+)$/, async (ctx) => {
  ctx.dbChat = await ctx.dbStore.updateChatProp(
    ctx.chat.id,
    "language_code",
    ctx.match[1] as ChatLanguageCode,
  );
});

cbQueryComposer.callbackQuery("close", async (ctx) => {
  const reply = ctx.message?.reply_to_message;
  if (reply) {
    await ctx.api.deleteMessage(ctx.chat.id, reply.message_id).catch(noop);
  }
  await ctx.deleteMessage();
});

export default composer;
