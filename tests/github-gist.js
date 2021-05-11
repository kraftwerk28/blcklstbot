'use strict';
const fetch = require('node-fetch').default;
const fs = require('fs');
const path = require('path');

const GITHUB_API_KEY = '5457c284ded0d1b965f2b8ad3b158d0acab422a0';
const BASE = 'https://api.github.com/gists';

(async () => {
  const args = process.argv.slice(2);
  if (!args.length) return;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `token ${GITHUB_API_KEY}`,
  };
  const filename = path.basename(args[0]);
  const body = {
    description: 'Sample description',
    files: {
      [filename.slice(0, -3)]: {
        content: fs.readFileSync(args[0], 'utf-8'),
      },
    },
    public: true,
  };
  const response = await fetch(BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  console.dir(response);
  console.log('Status: %d (%s)', response.status, response.statusText);
  const responseBody = await response.json();
  console.dir(responseBody);
})();
