import { Captcha } from '../utils/captcha';

export type CaptchaMode =
  | 'arithmetic'
  | 'matrix-denom';

type CaptchaMeta<Mode extends CaptchaMode, Meta extends Record<string, any>> = {
  mode: Mode,
  meta: Meta,
};

export type ArithmeticCaptcha = CaptchaMeta<'arithmetic', {
  expression: string,
  answer: number,
}>;

export type MatrixDenomCaptcha = CaptchaMeta<'matrix-denom', {
  matrix: number[][],
  answer: number,
}>;

type Captchas =
  | ArithmeticCaptcha
  | MatrixDenomCaptcha;

export type ExtractCaptchaMeta<Mode extends CaptchaMode> = Extract<
  Captchas,
  { mode: Mode }
>['meta'];

export type AbstractCaptcha = {
  [Mode in CaptchaMode]: Captcha<Mode>
}[CaptchaMode];
