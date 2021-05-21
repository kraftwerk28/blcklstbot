import {
  searchCppReference,
  searchMDN,
  searchStackOverflow,
} from '../utils/doc-search';
import { OnMiddleware, SearchProvider } from '../types';
import { link } from '../utils/html';
import { log } from '../logger';

const providers: SearchProvider[] = [
  { names: ['mdn', 'js'], fn: searchMDN },
  { names: ['so', 'stackoverflow'], fn: searchStackOverflow },
  { names: ['cpp', 'cppreference'], fn: searchCppReference },
];

export const docSearch: OnMiddleware<'inline_query'> = async function (
  ctx,
  next,
) {
  const match = ctx.inlineQuery.query.match(/^(\w+)\s+(.+)$/);
  if (!match) return next();
  const [, provider, query] = match;

  const searchFn = providers.find(({ names }) =>
    names.includes(provider.toLowerCase()),
  )?.fn;

  if (!searchFn) {
    return ctx.answerInlineQuery([], {
      switch_pm_text: 'Invalid search provider...',
      switch_pm_parameter: 'showhelp',
    });
  }

  try {
    const results = await searchFn(query);
    if (!results || !results.length) {
      return ctx.answerInlineQuery([], {
        switch_pm_text: 'No results...',
        switch_pm_parameter: 'showhelp',
      });
    }

    return ctx.answerInlineQuery(
      results.map((result, index) => {
        let message_text = link(result.link, result.title);
        if (result.text) {
          message_text += `\n${result.text}`;
        }
        return {
          type: 'article',
          id: index.toString(),
          title: result.title,
          input_message_content: {
            message_text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          },
          url: result.link,
        };
      }),
      { cache_time: process.env.NODE_ENV === 'development' ? 5 : 300 },
    );
  } catch (err) {
    log.error('Error in ::docSearch: %O', err);
    return ctx.answerInlineQuery([]);
  }
};
