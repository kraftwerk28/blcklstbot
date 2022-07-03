import { Composer } from '../composer';
import { DEFAULT_CAPCHA_MODES } from '../constants';
import { CaptchaMode, HearsMiddleware } from '../types';
import { senderIsAdmin, isGroupChat } from '../guards';
import { deleteMessage } from '../middlewares';

export const captcha = Composer.branch(
  Composer.allOf(senderIsAdmin, isGroupChat),
  async function (ctx) {
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
  } as HearsMiddleware,
  deleteMessage,
);
