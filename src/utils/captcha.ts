import { randBool, randInt } from './';
import { CaptchaMode, ExtractCaptchaMeta } from '../types';

// export enum CaptchaMode {
//   Arithmetic = 1 << 0,
//   ChooseButton = 1 << 1,
// }

const DEFAULT_CAPCHA_MODES: CaptchaMode[] = [
  'arithmetic',
  'matrix-denom',
];

export class Captcha<Mode extends CaptchaMode = any> {
  constructor(
    public mode: Mode,
    public meta: ExtractCaptchaMeta<Mode>,
  ) { }

  private static arithmeticCapcha(): Captcha<'arithmetic'> {
    const multiplier = randInt(2, 10);
    const isSum = randBool();
    let answer, expression;
    let term1, term2;
    if (isSum) {
      term1 = randInt(2, 5);
      term2 = randInt(3, 7);
      expression = `${multiplier} * (${term1} + ${term2})`;
      answer = multiplier * (term1 + term2);
    } else {
      term1 = randInt(4, 10);
      term2 = randInt(2, term1);
      expression = `${multiplier} * (${term1} - ${term2})`;
      answer = multiplier * (term1 - term2);
    }
    return new Captcha('arithmetic', { expression, answer });
  }

  private static matrixDenomCaptcha(): Captcha<'matrix-denom'> {
    let [a, b, c, d] = Array.from({ length: 4 }, () => randInt(10));
    let answer = a * d - c * b;
    if (answer < 0) {
      if (Math.random() < 0.5) {
        b *= -1;
      } else {
        d *= -1;
      }
    }
    return new Captcha('matrix-denom', {
      matrix: [[a, b], [c, d]],
      answer
    });
  }

  static generate(allowedCaptchaTypes: CaptchaMode[] = DEFAULT_CAPCHA_MODES) {
    const nthCatcha = randInt(allowedCaptchaTypes.length);
    const type = allowedCaptchaTypes[nthCatcha];
    switch (type) {
      case 'arithmetic':
        return this.arithmeticCapcha();
      case 'matrix-denom':
        return this.matrixDenomCaptcha();
    }
  }

  serialize(): string {
    return JSON.stringify({
      mode: this.mode,
      meta: this.meta,
    });
  }

  static deserialize(raw: string) {
    return JSON.parse(raw) as Captcha;
  }
}
