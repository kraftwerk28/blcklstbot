import { request } from 'https';
import { stringify as qsstr } from 'querystring';

export function fetch<T>(
  url: string,
  queryData: Record<string, any>,
  options: any = {},
) {
  const cb = (resolve: any, reject: any) => {
    const opts = {
      method: 'GET',
      ...options,
    };

    let requrl = url;
    if (queryData && opts.method === 'GET') {
      requrl += `?${qsstr(queryData)}`;
    }

    request(requrl, opts, res => {
      if (res.statusCode!.toString()[0] !== '2') {
        reject('Bad status code (not 2xx)');
        return;
      }
      let data = '';
      res.on('data', ch => (data += ch));
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
      res.on('error', reject);
    }).end();
  };
  return new Promise<T>(cb);
}
