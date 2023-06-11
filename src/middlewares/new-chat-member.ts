import { Message, User } from "typegram";

import { Composer } from "../composer";
import { noop, safePromiseAll } from "../utils";
import { Ctx, OnMiddleware, CaptchaMode } from "../types";
import { generateCaptcha } from "../captcha";
// import { Captcha } from '../utils/captcha';
import { code, userMention } from "../utils/html";
import { captchaHash } from "../utils/event-queue";
import { botHasSufficientPermissions } from "../guards";
import { log } from "../logger";

type Middleware = OnMiddleware<"new_chat_members" | "chat_member">;

/**
 * Creates capthca.
 * Also registers user in DB for messages tracking
 */
export const onNewChatMember: Middleware = Composer.guardAll(
  [
    async function (ctx) {
      // `/me` also wants to pass captcha so ima about to comment dis :)
      // if (ctx.from?.id === ctx.botCreatorId) return false;
      const cm = await ctx.getChatMember(ctx.from!.id);
      return cm.status === "member";
    },
    botHasSufficientPermissions,
  ],
  async function (ctx, next) {
    if (ctx.dbChat.delete_joins) {
      await ctx.deleteMessage().catch(noop);
    }
    if (!ctx.dbChat.captcha_modes.length) {
      return next();
    }
    if (ctx.message?.new_chat_members?.length) {
      const promises = ctx.message.new_chat_members.map((cm) =>
        userCaptcha(ctx, cm),
      );
      safePromiseAll(promises);
      return;
    } else if (ctx.chatMember) {
      // TODO
      return;
    }
    return next();
  } as Middleware,
);

async function userCaptcha(ctx: Ctx, user: User) {
  const captcha = generateCaptcha(ctx.dbChat.captcha_modes);
  const captchaTimeout = ctx.dbChat.captcha_timeout;
  ctx.dbStore.addPendingCaptcha(ctx.chat!.id, user.id, captcha, captchaTimeout);
  let captchaMessage: Message;
  log.info({ chat: ctx.chat, user, captcha }, "Generating new captcha");

  switch (captcha.mode) {
    case CaptchaMode.Arithmetic: {
      captchaMessage = await ctx.replyWithHTML(
        ctx.t("math_captcha", { user: userMention(user) }) +
          "\n" +
          code(captcha.meta.expression) +
          "\n" +
          ctx.t("captcha_remaining", { seconds: ctx.dbChat.captcha_timeout }),
      );
      break;
    }
    case CaptchaMode.ArithmeticWorded: {
      const NUM_NAME = {
        1: { en: "one", uk: "один" },
        2: { en: "two", uk: "два" },
        3: { en: "three", uk: "три" },
        4: { en: "four", uk: "чотири" },
        5: { en: "five", uk: "п'ять" },
        6: { en: "six", uk: "шість" },
        7: { en: "seven", uk: "сім" },
        8: { en: "eight", uk: "вісім" },
        9: { en: "nine", uk: "дев'ять" },
      };
      const { multiplier, s1, s2, isSum, nthTermToStringify } = captcha.meta;
      let [a, b, c] = [multiplier, s1, s2].map((it) => it.toString());
      switch (nthTermToStringify) {
        case 0:
          // @ts-expect-error bad type
          a = NUM_NAME[a][ctx.dbChat.language_code] ?? a;
          break;
        case 1:
          // @ts-expect-error bad type
          b = NUM_NAME[b][ctx.dbChat.language_code] ?? b;
          break;
        case 2:
          // @ts-expect-error bad type
          c = NUM_NAME[c][ctx.dbChat.language_code] ?? c;
      }
      let expression: string;
      if (isSum) {
        expression = `${a} × (${b} + ${c})`;
      } else {
        expression = `${a} × (${b} - ${c})`;
      }
      captchaMessage = await ctx.replyWithHTML(
        ctx.t("math_captcha", { user: userMention(user) }) +
          "\n" +
          code(expression) +
          "\n" +
          ctx.t("captcha_remaining", { seconds: ctx.dbChat.captcha_timeout }),
      );
      break;
    }
    case CaptchaMode.Matrix: {
      const matrixText = captcha.meta.matrix
        .map((row) => "| " + row.join(" ") + " |")
        .join("\n");
      captchaMessage = await ctx.replyWithHTML(
        ctx.t("matrix_captcha", { user: userMention(user) }) +
          "\n" +
          code(matrixText) +
          "\n" +
          ctx.t("captcha_remaining", { seconds: ctx.dbChat.captcha_timeout }),
      );
      break;
    }
  }

  await ctx.eventQueue.pushDelayed(
    captchaTimeout,
    "captcha_timeout",
    {
      chatId: ctx.chat!.id,
      userId: user.id,
      captchaMessageId: captchaMessage.message_id,
      newChatMemberMessageId: ctx.message!.message_id,
    },
    captchaHash(ctx.chat!.id, user.id),
  );
}
