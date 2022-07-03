import fetch from "node-fetch";
import cheerio from "cheerio";
import { URL } from "url";
// import { SearchProvider } from '../types';
import { CPPREFERENCE_URL, MDN_URL } from "../constants";
import { log } from "../logger";
import { link } from "./html";
import { SearchProvider } from "../types";

export function getProviderByAlias(alias: string): SearchProvider | undefined {
  const lc = alias.toLowerCase();
  return searchProviders.find(({ aliases }) => aliases.includes(lc));
}

export function getProviderByName(name: string): SearchProvider | undefined {
  return searchProviders.find(p => p.name === name);
}

export const searchProviders: SearchProvider[] = [
  {
    name: "MDN",
    aliases: ["mdn", "js"],
    async search(query) {
      const url = new URL(`${MDN_URL}/api/v1/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("locale", "en-US");
      const response = await fetch(url);
      if (!response.ok) return;
      const json = await response.json();
      const items = json["documents"] as {
        mdn_url: string;
        title: string;
        summary: string;
      }[];
      const queryResults = items.map(doc => ({
        link: `${MDN_URL}${doc.mdn_url}`,
        title: doc.title,
        text: doc.summary,
      }));
      return queryResults;
    },
  },

  {
    name: "StackOverflow",
    aliases: ["so", "stackoverflow"],
    async search(query) {
      const url = new URL("https://api.stackexchange.com/search/advanced");
      url.searchParams.append("q", query);
      url.searchParams.append("site", "stackoverflow");
      url.searchParams.append("key", process.env.STACKEXCHANGE_API_KEY!);
      const response = await fetch(url);
      if (!response.ok) return;
      const json = await response.json();
      const items = json["items"] as Record<string, any>[];
      return items.map(item => {
        const { title, link, accepted_answer_id, question_id } = item;
        return {
          title: item.title,
          link: item.link,
          metadata: { accepted_answer_id, question_id, title, link },
        };
      });
    },
    async getFullText({ title, link: href, question_id }) {
      const url = new URL(
        `https://api.stackexchange.com/questions/${question_id}/answers`,
      );
      url.searchParams.append("site", "stackoverflow");
      url.searchParams.append("filter", "!.FdBMUpny)82DKxlxVlXn.CujPFi9");
      url.searchParams.append("key", process.env.STACKEXCHANGE_API_KEY!);
      const response = await fetch(url);
      if (!response.ok) {
        return;
      }
      const json = await response.json();
      const htmlBody = json["items"][0]["body"] as string;
      const sanitizedBody = htmlBody.replace(/<\/?(\w+)[^>]*>/g, (m, tag) => {
        if (["a", "b", "i", "s", "code", "pre"].includes(tag)) {
          return m;
        }
        return "";
      });
      return `${link(href, title)}\n${sanitizedBody}`;
    },
  },

  {
    name: "cppreference",
    aliases: ["cpp", "cppreference"],
    async search(query) {
      const url = new URL(`${CPPREFERENCE_URL}/w`);
      url.searchParams.append("search", query);
      const response = await fetch(url);
      if (!response.ok) {
        return;
      }
      const rawHtml = await response.text();
      const $ = cheerio.load(rawHtml);
      return $(".searchresults ul.mw-search-results a")
        .toArray()
        .map(aHref => {
          const link = `${CPPREFERENCE_URL}${$(aHref).attr("href")}`;
          return { link, title: $(aHref).text(), metadata: { link } };
        });
    },
  },
  // {
  //   name: 'Nodejs',
  //   aliases: ['node', 'nodejs'],
  //   async search(query) {
  //     return [];
  //   },
  // },
];
