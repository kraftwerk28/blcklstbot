import fetch from 'node-fetch';
import cheerio from 'cheerio';
import { URL } from 'url';
import { SearchProvider } from '../types';
import { CPPREFERENCE_URL, MDN_URL } from '../constants';
import { log } from '../logger';

export function getProviderByAlias(alias: string): SearchProvider | undefined {
  const lc = alias.toLowerCase();
  return searchProviders.find(({ aliases }) => aliases.includes(lc));
}

export const searchProviders: SearchProvider[] = [
  {
    name: 'MDN',
    aliases: ['mdn', 'js'],
    async search(query) {
      const url = new URL(`${MDN_URL}/api/v1/search`);
      url.searchParams.set('q', query);
      url.searchParams.set('locale', 'en-US');

      const response = await fetch(url);
      log.info('Status: %d (%s)', response.status, response.statusText);
      if (response.status !== 200) return;
      const json = await response.json();
      const queryResults = json['documents'].map((doc: any) => ({
        link: `${MDN_URL}${doc.mdn_url}`,
        title: doc.title,
        text: doc.summary,
      }));
      return queryResults;
    },
  },
  {
    name: 'StackOverflow',
    aliases: ['so', 'stackoverflow'],
    async search(query) {
      const url = new URL('https://api.stackexchange.com/search/advanced');
      url.searchParams.append('q', query);
      url.searchParams.append('site', 'stackoverflow.com');
      log.info('SO search url: %s', url);
      const response = await fetch(url);
      if (response.status !== 200) return;
      const json = await response.json();
      return json['items'].map((item: Record<string, string>) => ({
        title: item.title,
        link: item.link,
      }));
    },
  },
  {
    name: 'cppreference',
    aliases: ['cpp', 'cppreference'],
    async search(query) {
      const url = new URL(`${CPPREFERENCE_URL}/w`);
      url.searchParams.append('search', query);
      const response = await fetch(url);
      if (response.status !== 200) {
        return;
      }
      const rawHtml = await response.text();
      const $ = cheerio.load(rawHtml);
      return $('.searchresults ul.mw-search-results a')
        .toArray()
        .map((aHref) => ({
          link: `${CPPREFERENCE_URL}${$(aHref).attr('href')}`,
          title: $(aHref).text(),
        }));
    },
  },
];
