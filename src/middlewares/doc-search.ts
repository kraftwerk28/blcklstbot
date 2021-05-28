import { Markup } from 'telegraf';
import { InlineQueryResult } from 'typegram';
import { OnMiddleware } from '../types';
import { link, escape } from '../utils/html';
import { log } from '../logger';
import { searchProviders } from '../utils/doc-search';

type Mw = OnMiddleware<'inline_query'>;

const cache_time = process.env.NODE_ENV === 'development' ? 5 : 300;

export const docSearch: Mw = async function (ctx, next) {
  // return ctx.answerInlineQuery(
  //   Array.from({ length: 10 }, (_, i) => ({
  //     type: 'article',
  //     id: `foo_${i}`,
  //     title: 'My title',
  //     input_message_content: {
  //       message_text: `Message #${i}`,
  //     },
  //     reply_markup: Markup.inlineKeyboard([
  //       // Markup.button.callback('Foo', 'foo'),
  //       // Markup.button.callback('Bar', 'bar'),
  //     ]).reply_markup,
  //   })),
  //   { cache_time: 5 },
  // );

  const match = ctx.inlineQuery.query.match(/^(\w+)\s+(.+)$/);
  if (!match) return next();
  const [, provider, query] = match;

  const searchProvider = searchProviders.find(({ aliases }) =>
    aliases.includes(provider.toLowerCase()),
  );

  if (!searchProvider) {
    return ctx.answerInlineQuery([], {
      switch_pm_text: 'Invalid search provider...',
      switch_pm_parameter: 'showhelp',
    });
  }

  try {
    const results = await searchProvider.search(query);

    if (!results?.length) {
      return ctx.answerInlineQuery([], {
        switch_pm_text: 'No results...',
        switch_pm_parameter: 'showhelp',
      });
    }
    const resultIds = await ctx.dbStore.addInlineResultMetadata(results);

    const inlineResults: InlineQueryResult[] = results.map((result, index) => {
      let text = link(result.link, result.title);
      if (result.text) {
        text += `\n${escape(result.text)}`;
      }
      const { reply_markup } = Markup.inlineKeyboard([
        Markup.button.url(searchProvider.name, result.link),
      ]);
      const resultId = `${searchProvider.name}:${123}`;
      return {
        type: 'article',
        id: index.toString(),
        title: escape(result.title),
        input_message_content: {
          message_text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        },
        reply_markup,
        url: result.link,
      };
    });

    return ctx.answerInlineQuery(inlineResults, { cache_time });
  } catch (err) {
    log.error('Error in ::docSearch: %O', err);
    return ctx.answerInlineQuery([]);
  }
};
