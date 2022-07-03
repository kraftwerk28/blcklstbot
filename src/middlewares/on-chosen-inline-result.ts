import { Markup } from "telegraf";

import { log } from "../logger";
import { OnMiddleware } from "../types";
import { getProviderByName } from "../utils/doc-search";
import { bold } from "../utils/html";

type Mw = OnMiddleware<"chosen_inline_result">;

export const onChosenInlineResult: Mw = async function (ctx, next) {
  const { chosenInlineResult } = ctx;
  log.info("Chosen inline result: %O", chosenInlineResult);
  const match = chosenInlineResult.result_id.match(/^(\w+):(\d+)$/);
  if (!match) return next();
  const [, providerName, resultIdStr] = match;
  const userId = chosenInlineResult.from.id;
  const searchProvider = getProviderByName(providerName);
  if (!searchProvider?.getFullText) return next();
  const metadata = await ctx.dbStore.getInlineResultMeta(
    userId,
    searchProvider.name,
    +resultIdStr,
  );
  log.info("Inline result metadata: %O", metadata);
  let fullText: string | undefined;

  try {
    fullText = await searchProvider.getFullText(metadata);
  } catch {}
  const text = `${bold(providerName)}:\n${fullText}`;

  if (!fullText) {
    // Remove keyboard if full text isn't found
    return ctx.tg.editMessageReplyMarkup(
      undefined,
      undefined,
      chosenInlineResult.inline_message_id,
      Markup.inlineKeyboard([]).reply_markup,
    );
  } else {
    return ctx.tg.editMessageText(
      undefined,
      undefined,
      chosenInlineResult.inline_message_id,
      text,
      { parse_mode: "HTML", disable_web_page_preview: true },
    );
  }
};
