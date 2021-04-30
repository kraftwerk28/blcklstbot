import {
  CaptchaMode,
  CaptchaData,
  ArithmeticCaptcha,
  ChooseSingleButtonCaptcha,
} from '../types';

const DEFAULT_CAPCHA_MODES: CaptchaMode[] = [
  'arithmetic',
  'choose-single-button',
];

export class Captcha {
  constructor(
    public allowedCaptchaTypes: CaptchaMode[] = DEFAULT_CAPCHA_MODES
  ) { }

  private buttonCaptcha(): ChooseSingleButtonCaptcha {
    return {
      type: 'choose-single-button',
      buttons: ['foo'],
      correctBtnIndex: 0,
    };
  }

  private arithmeticCapcha(): ArithmeticCaptcha {
    return { type: 'arithmetic', expression: '1 + 2', answer: 3 };
  }

  generate(): CaptchaData {
    // const nthCatcha =
    //   Math.floor(Math.random() * this.allowedCaptchaTypes.length);
    const nthCatcha = 0;
    const type = this.allowedCaptchaTypes[nthCatcha];
    switch (type) {
      case 'arithmetic':
        return this.arithmeticCapcha();
      case 'choose-single-button':
        return this.buttonCaptcha();
    }
  }
}
