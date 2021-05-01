export type CaptchaMode = 'arithmetic' | 'matrix-denom';

type Captcha<T extends CaptchaMode, D> = {
  type: T,
  meta: D,
};

export type ArithmeticCaptcha = Captcha<'arithmetic', {
  expression: string,
  answer: number,
}>;

export type MatrixDenomCaptcha = Captcha<'matrix-denom', {
  matrix: number[][],
  answer: number,
}>;

export type CaptchaMeta = ArithmeticCaptcha | MatrixDenomCaptcha;

export type ExtractCaptchaMeta<M extends CaptchaMode> = Extract<
  CaptchaMeta,
  { type: M }
>['meta'];
