import { InlineKeyboardMarkup, User } from 'typegram';
import { Ctx } from './context';
import { MentionableUser, TranslateFn } from './utils';

export enum CaptchaMode {
  Arithmetic = 'arithmetic',
  Matrix = 'matrix',
  // Emoji = 'emoji',
}

export type ArithmeticCaptcha = Captcha<
  CaptchaMode.Arithmetic,
  { expression: string; answer: number }
>;

export type MatrixDenomCaptcha = Captcha<
  CaptchaMode.Matrix,
  { matrix: number[][]; answer: number }
>;

// export type EmojiCaptcha = Captcha<CaptchaMode.Emoji, { answer: number }>;

export type AbstractCaptcha = ArithmeticCaptcha | MatrixDenomCaptcha;
// TODO:
// | EmojiCaptcha;

// Util
type Captcha<Mode extends CaptchaMode, Meta extends Record<string, any>> = {
  mode: Mode;
  meta: Meta;
  deadline: number;
};

export type ExtractMeta<M extends CaptchaMode> = Extract<
  AbstractCaptcha,
  { mode: M }
>['meta'];

export type CaptchaDefs = {
  [M in CaptchaMode]: {
    mode: M,
    check(ctx: Ctx, meta: ExtractMeta<M>): boolean;
    generate(): ExtractMeta<M>;
    // TODO: This is very bad way to pass translation and other things to it
    getMessageMetadata(
      t: TranslateFn,
      meta: ExtractMeta<M>,
      targetUser: MentionableUser,
      secondsLeft: number,
    ): { text: string, keyboard?: InlineKeyboardMarkup };
  };
}[CaptchaMode][];
