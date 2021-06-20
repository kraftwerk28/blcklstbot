import { InlineKeyboardMarkup } from 'typegram';
import { DEFAULT_CAPCHA_MODES } from '../constants';
import { log } from '../logger';
import {
  Ctx,
  CaptchaMode,
  CaptchaDefs,
  AbstractCaptcha,
  TranslateFn,
  MentionableUser,
} from '../types';
import { randBool, randInt, html, joinLines } from '../utils';

const captchas: CaptchaDefs = [
  {
    mode: CaptchaMode.Arithmetic,
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
    check(ctx: Ctx, meta) {
      if (!(ctx.message && 'text' in ctx.message)) return false;
      return parseInt(ctx.message?.text) === meta.answer;
    },
    getMessageMetadata(t, meta, user, secondsLeft) {
      return {
        text: joinLines(
          t('math_captcha', { user: html.userMention(user) }),
          html.code(meta.expression),
          t('captcha_remaining', { seconds: secondsLeft }),
        ),
      };
    },
  },

  {
    mode: CaptchaMode.Matrix,
    generate() {
      const [a, d] = [randInt(10), randInt(8)];
      const [b, c] = [randInt(4), randInt(7)];
      let answer = a * d - c * b;
      const matrix = [
        [a, b],
        [c, d],
      ];
      return { matrix, answer };
    },
    check(ctx, meta) {
      if (!(ctx.message && 'text' in ctx.message)) return false;
      return parseInt(ctx.message?.text) === meta.answer;
    },
    getMessageMetadata(t, meta, user, secondsLeft) {
      const matrixText = meta.matrix
        .map(row => '| ' + row.join(' ') + ' |')
        .join('\n');
      return {
        text: joinLines(
          t('matrix_captcha', { user: html.userMention(user) }),
          html.code(matrixText),
          t('captcha_remaining', { seconds: secondsLeft }),
        ),
      };
    },
  },

  // {
  //   mode: CaptchaMode.Emoji,
  //   generate() {
  //     return { answer: 123 };
  //   },
  //   check(ctx, meta) {
  //     return false;
  //   },
  // },
];

export function generateCaptcha(
  modes = DEFAULT_CAPCHA_MODES,
  deadline: number,
): AbstractCaptcha {
  const mode = modes[randInt(modes.length)];
  const meta = captchas.find(cd => cd.mode === mode)!.generate();
  const captcha = { mode, meta, deadline };
  log.info('New captcha: %O', captcha);
  return captcha as AbstractCaptcha;
}

export function serializeCaptcha(captcha: AbstractCaptcha) {
  return JSON.stringify(captcha);
}

export function deserializeCaptcha(raw: string): AbstractCaptcha | undefined {
  try {
    const { mode, meta, deadline } = JSON.parse(raw);
    return { mode, meta, deadline };
  } catch {
    return;
  }
}

export function checkCaptchaAnswer(
  ctx: Ctx,
  captcha: AbstractCaptcha,
): boolean {
  return captchas
    .find(cd => cd.mode === captcha.mode)!
    .check(ctx, captcha.meta as any);
}

export function getCaptchaMessage(
  t: TranslateFn,
  captcha: AbstractCaptcha,
  user: MentionableUser,
  secondsLeft: number,
): { text: string; keyboard?: InlineKeyboardMarkup } {
  return captchas
    .find(cd => cd.mode === captcha.mode)!
    .getMessageMetadata(
      t,
      captcha.meta as any,
      user,
      secondsLeft,
    );
}
