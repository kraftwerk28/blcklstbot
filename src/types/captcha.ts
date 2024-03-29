import { Ctx } from "./context";

export enum CaptchaMode {
  Arithmetic = "arithmetic",
  ArithmeticWorded = "arithmetic_worded",
  Matrix = "matrix",
}

type Captcha<Mode extends CaptchaMode, Meta extends Record<string, any>> = {
  mode: Mode;
  meta: Meta;
};

export type ArithmeticCaptcha = Captcha<
  CaptchaMode.Arithmetic,
  {
    expression: string;
    answer: number;
  }
>;

export type ArithmeticWordedCaptcha = Captcha<
  CaptchaMode.ArithmeticWorded,
  {
    multiplier: number;
    s1: number;
    s2: number;
    isSum: boolean;
    nthTermToStringify: number;
    answer: number;
  }
>;

export type MatrixDenomCaptcha = Captcha<
  CaptchaMode.Matrix,
  {
    matrix: number[][];
    answer: number;
  }
>;

export type AbstractCaptcha =
  | ArithmeticCaptcha
  | ArithmeticWordedCaptcha
  | MatrixDenomCaptcha;

export type ExtractMeta<M extends CaptchaMode> = Extract<
  AbstractCaptcha,
  { mode: M }
>["meta"];

export type CaptchaDefs = {
  [M in CaptchaMode]: {
    check(ctx: Ctx, meta: ExtractMeta<M>): boolean;
    generate(): ExtractMeta<M>;
  };
};
