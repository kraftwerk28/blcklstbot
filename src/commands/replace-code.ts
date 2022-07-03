import { Composer } from '../composer';
import { CommandMiddleware } from '../types';
import { botHasSufficientPermissions, isGroupChat } from '../guards';

export const replaceCode = Composer.optional(
  Composer.allOf(isGroupChat, botHasSufficientPermissions),
  async function (ctx) {
    await ctx.deleteMessage();
    await ctx.dbStore.updateChatProp(
      ctx.chat.id,
      'upload_to_gist',
      !ctx.dbChat.upload_to_gist,
    );
  } as CommandMiddleware,
);
