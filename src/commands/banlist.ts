import { Markup } from "telegraf";
import { Composer } from "../composer";
import { isGroupChat, senderIsAdmin } from "../guards";
import { deleteMessage } from "../middlewares";
import { CommandMiddleware, DbUser } from "../types";
import { userFullName } from "../utils/html";

export const banList = Composer.branchAll(
  [senderIsAdmin, isGroupChat],
  async function (ctx) {
    const chatId = ctx.chat.id;
    const bannedUsers: DbUser[] = await ctx.dbStore
      .knex("users")
      .where({ chat_id: chatId, banned: true });
    await ctx.deleteItSoon()(ctx.message);
    if (!bannedUsers.length) {
      await ctx.reply(ctx.t("banlist_empty")).then(ctx.deleteItSoon());
      return;
    }
    const { reply_markup } = Markup.inlineKeyboard(
      bannedUsers.map((user) => {
        let buttonText = userFullName(user);
        if (user.banned_timestamp) {
          buttonText +=
            " (" + user.banned_timestamp.toLocaleDateString("uk-UA") + ")";
        }
        const cbData = `unban:${chatId}:${user.id}`;
        return [Markup.button.callback(buttonText, cbData)];
      }),
    );
    await ctx
      .replyWithHTML(ctx.t("banlist_title"), { reply_markup })
      .then(ctx.deleteItSoon());
  } as CommandMiddleware,
  deleteMessage,
);
