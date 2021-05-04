import { Captcha } from '../utils/captcha';

export enum CaptchaMode {
  Arithmetic = 'arithmetic',
  Matrix = 'matrix',
}

export type ArithmeticCaptcha = CaptchaMeta<CaptchaMode.Arithmetic, {
  expression: string,
  answer: number,
}>;

type Person = {
  _id: number,
  name: string,
  age: number
};

export type MatrixDenomCaptcha = CaptchaMeta<CaptchaMode.Matrix, {
  matrix: number[][],
  answer: number,
}>;

type CaptchaMeta<Mode extends CaptchaMode, Meta extends Record<string, any>> = {
  mode: Mode,
  meta: Meta,
};

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
