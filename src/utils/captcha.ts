import { randBool, randInt } from './';
import { CaptchaMode, ExtractCaptchaMeta } from '../types';
import { log } from '../logger';
import { DEFAULT_CAPCHA_MODES } from '../constants';

export class Captcha<Mode extends CaptchaMode = CaptchaMode> {
  constructor(
    public mode: Mode,
    public meta: ExtractCaptchaMeta<Mode>,
  ) {
  }

  private static arithmeticCapcha() {
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
    return new Captcha(CaptchaMode.Arithmetic, { expression, answer });
  }

  private static matrixDenomCaptcha() {
    const [a, d] = [randInt(10), randInt(8)];
    const [b, c] = [randInt(4), randInt(7)];
    let answer = a * d - c * b;
    const matrix = [[a, b], [c, d]];
    return new Captcha(CaptchaMode.Matrix, { matrix, answer });
  }

  static generate(allowedCaptchaTypes: CaptchaMode[] = DEFAULT_CAPCHA_MODES) {
    const nthCatcha = randInt(allowedCaptchaTypes.length);
    const type = allowedCaptchaTypes[nthCatcha];
    let captcha;
    switch (type) {
      case CaptchaMode.Arithmetic:
        captcha = this.arithmeticCapcha();
        break;
      case CaptchaMode.Matrix:
        captcha = this.matrixDenomCaptcha();
        break;
    }
    log.info('New captcha: %o', captcha);
    return captcha;
  }

  serialize(): string {
    return JSON.stringify({
      mode: this.mode,
      meta: this.meta,
    });
  }

  static deserialize(raw: string) {
    try {
      const { mode, meta } = JSON.parse(raw);
      return new Captcha(mode, meta);
    } catch {
      return null;
    }
  }

  checkAnswer(input: string): boolean {
    switch (this.mode) {
      case CaptchaMode.Arithmetic:
      case CaptchaMode.Matrix:
        return parseInt(input) === this.meta.answer;
      default:
        return true;
    }
  }
}
