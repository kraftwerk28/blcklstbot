export type SearchEntry = { title: string; link: string; text?: string };

export type DocSearchFn = (query: string) => Promise<SearchEntry[] | null>;

export type SearchProvider = { names: string[]; fn: DocSearchFn };
