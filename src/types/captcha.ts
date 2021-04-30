export type CaptchaMode = 'arithmetic' | 'choose-single-button';

export type ArithmeticCaptcha = {
  type: 'arithmetic',
  expression: string,
  answer: number,
};

export type ChooseSingleButtonCaptcha = {
  type: 'choose-single-button',
  buttons: string[],
  correctBtnIndex: number,
};

export type CaptchaData = ArithmeticCaptcha | ChooseSingleButtonCaptcha;
