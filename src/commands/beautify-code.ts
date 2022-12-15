import { Composer } from "../composer";
import {
  botHasSufficientPermissions,
  isGroupChat,
  senderIsAdmin,
} from "../guards";
import { CommandMiddleware } from "../types";

export const beautifyCode = Composer.guardAll(
  [botHasSufficientPermissions, senderIsAdmin, isGroupChat],
  async function (ctx) {
    await Promise.all([
      ctx.dbStore.updateChatProp(
        ctx.chat.id,
        "replace_code_with_pic",
        !ctx.dbChat?.replace_code_with_pic,
      ),
      ctx.deleteMessage(),
    ]);
  } as CommandMiddleware,
);
