import { Composer } from '../composer';
import { CommandMiddleware } from '../types';
import { senderIsAdmin, isGroupChat } from '../guards';
import { deleteMessage } from '../middlewares';

export const propagateReports = Composer.branchAll(
  [senderIsAdmin, isGroupChat],
  async function (ctx) {
    ctx.dbStore.updateChatProp(
      ctx.chat.id,
      'propagate_bans',
      !ctx.dbChat.propagate_bans,
    );
  } as CommandMiddleware,
  deleteMessage,
);
