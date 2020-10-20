import { request, RequestOptions } from 'https';
import qs from 'querystring';

type RestMethod =
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH';

export function rest<T>(
  url: string,
  method: RestMethod,
  headers: Record<string, string> = {},
  query?: Record<string, any>,
  body?: Record<string, any>,
  options: RequestOptions = {}
): Promise<T> {
  const callback = (resolve: any, reject: any) => {
    const fullUrl = new URL(url);
    const opts: RequestOptions = {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      ...options,
    };

    if (query) {
      fullUrl.search = qs.stringify(query);
    }
    if (method === 'POST') {
      opts.headers!['content-type'] = 'application/json';
    }

    const req = request(fullUrl, opts, (response) => {
      if (response.statusCode!.toString()[0] !== '2') {
        console.info(`${method} ${fullUrl.pathname} -> ${response.statusCode}`);
        reject(
          'Bad Blocklist API response:' +
          `${response.statusCode} ${response.statusMessage}`
        );
        return;
      }

      console.info(`${method} ${fullUrl.pathname} -> ${response.statusCode}`);
      const data = [] as any[];
      response
        .on('data', (ch) => data.push(ch))
        .on('end', () => {
          const d = Buffer.concat(data).toString();
          if (response.headers['content-type'] === 'application/json') {
            resolve(JSON.parse(d));
          }
          resolve(d);
        })
        .on('error', reject);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  };

  return new Promise(callback);
}
