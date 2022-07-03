import { Telegram } from "typegram";

export type SearchEntry<Meta = any> = {
  title: string;
  link: string;
  text?: string;
  metadata?: Meta;
};

export type SearchProvider<Meta = any> = {
  name: string;
  aliases: string[];
  /** Get array of search results */
  search(query: string): Promise<SearchEntry<Meta>[] | undefined>;
  // answerQuery(ctx: MatchedContext<Ctx, 'inline_query'>): Promise<void>;
  onChosenInlineResult?(tg: Telegram, userId: number, meta: any): Promise<void>;
  getFullText?(meta: Meta): Promise<string | undefined>;
};

export type ChosenInlineResultMeta = Record<string, string>;
