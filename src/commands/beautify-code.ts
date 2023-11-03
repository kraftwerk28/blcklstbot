import { Composer } from "../composer.js";
import { senderIsAdmin } from "../guards/index.js";

// const composer = new Composer();
//
// composer
//   .chatType(["group", "supergroup"])
//   .use(senderIsAdmin)
//   .command("toggle_beautify", async (ctx) => {
//     await Promise.all([
//       ctx.dbStore.updateChatProp(
//         ctx.chat.id,
//         "replace_code_with_pic",
//         !ctx.dbChat?.replace_code_with_pic,
//       ),
//       ctx.deleteMessage(),
//     ]);
//   });
//
// export default composer;
