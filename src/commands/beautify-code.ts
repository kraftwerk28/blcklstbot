import { Composer } from 'telegraf';

import { botHasSufficientPermissions, senderIsAdmin } from '../guards';
import { CommandMiddleware } from '../types';
import { all } from '../utils';

export const beautifyCode = Composer.optional(
  all(botHasSufficientPermissions, senderIsAdmin),
  async function (ctx) {
    await Promise.all([
      ctx.dbStore.updateChatProp(
        ctx.chat.id,
        'replace_code_with_pic',
        !ctx.dbChat.replace_code_with_pic,
      ),
      ctx.deleteMessage(),
    ]);
  } as CommandMiddleware,
);
