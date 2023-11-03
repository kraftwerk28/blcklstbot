import { DEFAULT_CAPCHA_MODES } from "../constants.js";
import { log } from "../logger.js";
import { Context, CaptchaMode, CaptchaDefs, AbstractCaptcha } from "../types/index.js";
import { randBool, randInt } from "../utils/index.js";

const captchas: CaptchaDefs = {
  [CaptchaMode.Arithmetic]: {
    generate() {
      const multiplier = randInt(2, 10);
      const isSum = randBool();
      let answer, expression;
      let term1, term2;
      if (isSum) {
        term1 = randInt(2, 5);
        term2 = randInt(3, 7);
        expression = `${multiplier} × (${term1} + ${term2})`;
        answer = multiplier * (term1 + term2);
      } else {
        term1 = randInt(4, 10);
        term2 = randInt(2, term1);
        expression = `${multiplier} × (${term1} - ${term2})`;
        answer = multiplier * (term1 - term2);
      }
      return { expression, answer };
    },
    check(ctx: Context, meta) {
      if (!ctx.message?.text) return false;
      return parseInt(ctx.message.text) === meta.answer;
    },
  },
  [CaptchaMode.ArithmeticWorded]: {
    generate() {
      const multiplier = randInt(2, 10);
      const isSum = randBool();
      let answer;
      let term1, term2;
      if (isSum) {
        term1 = randInt(2, 5);
        term2 = randInt(3, 7);
        answer = multiplier * (term1 + term2);
      } else {
        term1 = randInt(4, 10);
        term2 = randInt(2, term1);
        answer = multiplier * (term1 - term2);
      }
      return {
        multiplier,
        s1: term1,
        s2: term2,
        isSum,
        answer,
        nthTermToStringify: randInt(0, 3),
      };
    },
    check(ctx: Context, meta) {
      if (!ctx.message?.text) return false;
      return parseInt(ctx.message?.text) === meta.answer;
    },
  },
  [CaptchaMode.Matrix]: {
    generate() {
      const [a, d] = [randInt(10), randInt(8)];
      const [b, c] = [randInt(4), randInt(7)];
      const answer = a * d - c * b;
      const matrix = [
        [a, b],
        [c, d],
      ];
      return { matrix, answer };
    },
    check(ctx, meta) {
      if (!ctx.message?.text) return false;
      return parseInt(ctx.message?.text) === meta.answer;
    },
  },
};

export function generateCaptcha(modes = DEFAULT_CAPCHA_MODES) {
  const mode = modes[randInt(modes.length)]!;
  const meta = captchas[mode].generate();
  const captcha = { mode, meta };
  log.info("New captcha: %O", captcha);
  return captcha as AbstractCaptcha;
}

export function serializeCaptcha(captcha: AbstractCaptcha) {
  return JSON.stringify(captcha);
}

export function deserializeCaptcha(raw: string): AbstractCaptcha | null {
  try {
    const { mode, meta } = JSON.parse(raw);
    return { mode, meta };
  } catch {
    return null;
  }
}

export function checkCaptchaAnswer(
  ctx: Context,
  captcha: AbstractCaptcha,
): boolean {
  const { mode, meta } = captcha;
  // @ts-expect-error unknown concrete type
  return captchas[mode].check(ctx, meta);
}
