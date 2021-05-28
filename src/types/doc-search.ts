import { Ctx } from "./context";
import { MatchedContext } from "./utils";

export type SearchEntry = {
  title: string;
  link: string;
  text?: string;
  metadata?: Record<string, any>;
};

export type DocSearchFn = (query: string) => Promise<SearchEntry[] | undefined>;

export type SearchProvider = {
  name: string;
  aliases: string[];
  /** Get array of search results */
  search: DocSearchFn;
  // answerQuery(ctx: MatchedContext<Ctx, 'inline_query'>): Promise<void>;
  onChosenInlineResult?(
    ctx: MatchedContext<Ctx, 'chosen_inline_result'>,
    metadata: any,
  ): Promise<void>;
};
