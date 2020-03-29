import { request } from 'https';
import { stringify as qsstr } from 'querystring';

export function fetch<T>(
  url: string,
  queryData: Record<string, any>,
  options: Record<string, any> = {},
): Promise<any> {
  const cb = (resolve: any, reject: any) => {
    const opts = {
      method: 'GET',
      ...options,
    };

    if (queryData && opts.method === 'GET') {
      url += `?${qsstr(queryData)}`;
    }

    const req = request(url, opts, res => {
      if (res.statusCode!.toString()[0] !== '2') {
        reject('Bad status code (not 2xx)');
        return;
      }
      const data: any[] = [];
      res
        .on('data', ch => data.push(ch))
        .on('end', () => resolve(JSON.parse(Buffer.concat(data).toString())))
        .on('error', reject);
    });
    req.end();
  };
  return new Promise<T>(cb);
}
