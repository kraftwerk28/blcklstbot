import { CaptchaMode, CaptchaData } from '~/types';

const DEFAULT_CAPCHA_MODES: CaptchaMode[] = [
  'arighmetic',
  'choose-single-button',
];

export class Captcha {
  constructor(
    public allowedCaptchaTypes: CaptchaMode[] = DEFAULT_CAPCHA_MODES
  ) { }

  generate(): CaptchaData {
    return;
  }
}
