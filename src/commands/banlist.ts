import { InlineKeyboard } from "grammy";
import { Composer } from "../composer.js";
import { senderIsAdmin } from "../guards/index.js";
import type { DbUser } from "../types/index.js";
import { userFullName } from "../utils/html.js";

const composer = new Composer();
export default composer;

const composer2 = composer.chatType(["group", "supergroup"]);

composer2
  .on("message")
  .command("banlist")
  .filter(senderIsAdmin)
  .use(async (ctx) => {
    const chatId = ctx.chat.id;
    const bannedUsers: DbUser[] = await ctx.dbStore
      .knex("users")
      .where({ chat_id: chatId, banned: true })
      .limit(10);
    await ctx.deleteItSoon()(ctx.message);
    if (!bannedUsers.length) {
      await ctx.reply(ctx.t("banlist_empty")).then(ctx.deleteItSoon());
      return;
    }
    const reply_markup = new InlineKeyboard(
      bannedUsers.map((user) => {
        let buttonText = userFullName(user);
        if (user.banned_timestamp) {
          buttonText +=
            " (" + user.banned_timestamp.toLocaleDateString("uk-UA") + ")";
        }
        const cbData = `unban:${chatId}:${user.id}`;
        return [InlineKeyboard.text(buttonText, cbData)];
      }),
    );
    await ctx
      .reply(ctx.t("banlist_title"), { reply_markup, parse_mode: "HTML" })
      .then(ctx.deleteItSoon());
  });

composer2
  .callbackQuery(/^unban:(.+):(.+)$/)
  .filter(senderIsAdmin)
  .use(async (ctx) => {
    await ctx.answerCallbackQuery("Not implemented");
  });
