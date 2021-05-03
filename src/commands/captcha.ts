import { DEFAULT_CAPCHA_MODES } from '../constants';
import { HearsMiddleware } from '../types';

export const captcha: HearsMiddleware = async function(ctx) {
  let modeList: string[] = [];
  if (ctx.match[1]) {
    modeList = ctx.match[1].split(/\s+/).map(s => s.toLowerCase());
    if (modeList.some(mode => mode === 'all')) {
      modeList = DEFAULT_CAPCHA_MODES;
    } else {
      modeList = modeList.filter(s => DEFAULT_CAPCHA_MODES.includes(s as any));
    }
  }
  await ctx.dbStore.updateChatProp(ctx.chat.id, 'captcha_modes', modeList);
};
