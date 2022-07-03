import { Markup } from 'telegraf';
import { InlineQueryResult } from 'typegram';

import { OnMiddleware } from '../types';
import { link, escape, bold } from '../utils/html';
import { log } from '../logger';
import { searchProviders } from '../utils/doc-search';
import { MAX_INLINE_RESULTS_AMOUNT } from '../constants';

type Mw = OnMiddleware<'inline_query'>;

const cache_time = process.env.NODE_ENV === 'development' ? 5 : 300;

export const docSearch: Mw = async function (ctx, next) {
  const match = ctx.inlineQuery.query.match(/^(\w+)\s+(.+)$/);
  if (!match) return next();
  const [, provider, query] = match;

  const searchProvider = searchProviders.find(({ aliases }) =>
    aliases.includes(provider.toLowerCase()),
  );

  if (!searchProvider) {
    return ctx.answerInlineQuery([], {
      switch_pm_text: 'Invalid search provider',
      switch_pm_parameter: 'showhelp',
    });
  }
  log.info(`Invoking provider "${searchProvider.name}" with query "${query}"`);

  try {
    const results = await searchProvider
      .search(query)
      .then(res => res?.slice(0, MAX_INLINE_RESULTS_AMOUNT));

    if (!results?.length) {
      return ctx.answerInlineQuery([], {
        switch_pm_text: 'No results...',
        switch_pm_parameter: 'showhelp',
      });
    }

    if (searchProvider.getFullText) {
      await ctx.dbStore.addInlineResultsMeta(
        ctx.from.id,
        searchProvider.name,
        results,
      );
    }

    const inlineResults: InlineQueryResult[] = results.map((result, index) => {
      let text = bold(searchProvider.name) + ':\n';
      text += link(result.link, result.title);
      if (result.text) {
        text += `\n${escape(result.text)}`;
      }
      const entry = {
        type: 'article',
        id: `${searchProvider.name}:${index}`,
        title: escape(result.title),
        input_message_content: {
          message_text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        },
        url: result.link,
      } as const;
      if (searchProvider.getFullText) {
        // Add a useless button to be able to edit message
        // IDK why it only works this way, please ask Telegram developers
        Object.assign(
          entry,
          Markup.inlineKeyboard([
            Markup.button.url(searchProvider.name, result.link),
          ]),
        );
      }
      return entry;
    });

    return ctx.answerInlineQuery(inlineResults, { cache_time });
  } catch (err) {
    log.error('Error in ::docSearch: %O', err);
    return ctx.answerInlineQuery([]);
  }
};
