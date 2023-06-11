import { User } from "typegram";
import { randInt } from "./utils";

enum CaptchaType {
  MatrixDenominator,
  MathExpression,
}

type MatrixDenominatorCaptcha = {
  matrix: number[][];
  answer: number;
};

type MathExpressionCaptcha = {
  expression: string;
  answer: number;
};

type CaptchaData = MatrixDenominatorCaptcha | MathExpressionCaptcha;

export class Captcha {
  constructor(private type: CaptchaType, private data: CaptchaData) {}

  static generate(type: CaptchaType) {
    switch (type) {
      case CaptchaType.MatrixDenominator:
        return this.genMatrixCaptcha();
      case CaptchaType.MathExpression:
        return this.genMathExpressionCaptcha();
    }
  }

  private static genMatrixCaptcha() {
    let [a, b, c, d] = Array(4)
      .fill(0)
      .map(() => randInt(10));
    let answer = a * d - c * b;
    if (answer < 0) {
      if (Math.random() < 0.5) {
        b *= -1;
      } else {
        d *= -1;
      }
    }
    const data: MatrixDenominatorCaptcha = {
      matrix: [
        [a, b],
        [c, d],
      ],
      answer,
    };
    return new Captcha(CaptchaType.MatrixDenominator, data);
  }

  private static genMathExpressionCaptcha() {
    // TODO
  }

  toText(user: User): string {
    switch (this.type) {
      // TODO
      case CaptchaType.MatrixDenominator:
        return "Find following matrix denominator:";
      case CaptchaType.MathExpression:
        return "Solve following math expression:";
    }
  }

  check(answer: string): boolean {
    switch (this.type) {
      case CaptchaType.MatrixDenominator:
      case CaptchaType.MathExpression: {
        const answerNum = parseInt(answer);
        return !isNaN(answerNum) && this.data.answer === answerNum;
      }
    }
  }

  serialize() {
    const payload = [this.type, this.data];
    return JSON.stringify(payload);
  }

  static deserialize(raw: string) {
    try {
      const [type, data] = JSON.parse(raw);
      return new Captcha(type, data);
    } catch (err) {
      return null;
    }
  }
}
