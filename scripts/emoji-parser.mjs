import cheerio from 'cheerio';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';

(async () => {
  const response = await fetch(
    'https://character.construction/emoji-categories',
  );
  if (!response.ok) return;
  const content = await response.text();
  const $ = cheerio.load(content);
  const categories = [];
  const enabled = {};

  for (const t of $('article.post > h3 + table').toArray()) {
    const h3 = $(t).prev();
    const emojis = $('tbody tr', t)
      .toArray()
      .map(el => ({
        name: $('td:nth-child(1)', el).text(),
        emoji: $('td:nth-child(2) span', el).text(),
        codes: $('td:nth-child(3)', el)
          .html()
          .split('<br>')
          .map(s => s.slice(2)),
      }));
    const category = h3.attr('id');
    const entry = {
      category,
      title: h3.text(),
      emojis,
    };
    enabled[category] = true;
    categories.push(entry);
  }
  const result = {
    enabled,
    categories,
  };
  await fs.writeFile(process.argv[2], JSON.stringify(result, null, 2));
})();
