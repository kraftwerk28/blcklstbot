import { bold, escape, link } from "../utils/html.js";
import { Composer } from "../composer.js";
import {
  botHasSufficientPermissions,
  isGroupChat,
  senderIsAdmin,
} from "../guards/index.js";
import { CommandMiddleware } from "../types/index.js";

// const composer = new Composer();

// export default composer;

// composer
//   .command("help")
//   .chatType(["group", "supergroup"])
//   .use(async (ctx) => {
//     const isAdmin = await senderIsAdmin(ctx);
//     const commandList = [
//       "/help - show current help",
//       "/ping <seconds> [text] - ping yourself after a time",
//     ];
//     if (isAdmin) {
//       commandList.push(
//         "/rules - set/show rules message for chat (must reply, admins only)",
//         "/report [reason] - report user (admins only)",
//         "/warn <reason> - warn user. The reason is required only first time (admins only)",
//         "/settings - show chat settings",
//         "/captcha_timeout <seconds> - set captcha timeout (must be between 10 seconds and 5 minutes)",
//         '/captcha <type> [type]... - set captcha that will be randomly selected (pass "all" to select all types)',
//         '/delete_joins <type> [type]... - delete messages "*user* joined the group"',
//         "/propagate_reports - toggle report propagation, i.e. banned user will be banned in other chats also",
//         "/replace_code - toggle automatic code uploading to GitHub Gist (admins only)",
//       );
//     }
//     const links = [
//       ["https://github.com/kraftwerk28/blcklstbot", "Bot code"],
//       [
//         "https://github.com/kraftwerk28/tree-sitter-highlight-server",
//         "Code highlighting server",
//       ],
//       [
//         "https://github.com/kraftwerk28/enry-server",
//         "Language detection server",
//       ],
//     ];
//     const textRows = [
//       bold("Commands:"),
//       escape(commandList.join("\n")),
//       "",
//       "To make a text substitution, which is somewhat similar to " +
//         link("https://en.wikipedia.org/wiki/Sed", "GNU/sed") +
//         ", just reply to text message with a pattern(-s) to make proper substitution(-s)",
//       "",
//       bold("Links:"),
//       ...links.map(([l, t]) => `• ${link(l!, t!)}`),
//     ];
//     await ctx.deleteItSoon()(ctx.message);
//     return ctx
//       .replyWithHTML(textRows.join("\n"), {
//         reply_to_message_id: ctx.message.message_id,
//         disable_web_page_preview: true,
//       })
//       .then(ctx.deleteItSoon());
//   });

// export const help = Composer.guardAll(
//   [isGroupChat, botHasSufficientPermissions],
//   async function (ctx) {
//   } as CommandMiddleware,
// );
