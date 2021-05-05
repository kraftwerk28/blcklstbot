import { Composer } from '../composer';
import { DEFAULT_CAPCHA_MODES } from '../constants';
import { CaptchaMode, HearsMiddleware } from '../types';
import { senderIsAdmin } from '../guards';

export const captcha = Composer.optional(
  senderIsAdmin,
  async function(ctx) {
    let modeList: string[] = [];
    if (ctx.match[1]) {
      modeList = ctx.match[1].split(/\s+/).map((s) => s.toLowerCase());
      if (modeList.some((mode) => mode === 'all')) {
        modeList = DEFAULT_CAPCHA_MODES;
      } else {
        modeList = modeList.filter((s) =>
          DEFAULT_CAPCHA_MODES.includes(s as any),
        );
      }
    }
    await Promise.allSettled([
      ctx.dbStore.updateChatProp(
        ctx.chat.id,
        'captcha_modes',
        modeList as CaptchaMode[],
      ),
      ctx.deleteMessage(),
    ]);
  } as HearsMiddleware
);
