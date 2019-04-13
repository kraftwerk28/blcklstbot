import { request } from 'https'

const fetch = (url, options, queryData) =>
  new Promise((resolve, reject) => {
    const opts = {
      method: 'GET',
      ...options
    }
    
    let requrl = url
    if (queryData && opts.method === 'GET') {
      requrl += '?' + Object.keys(queryData)
        .reduce((res, cur) =>
          `${res}${cur}=${queryData[cur]}&`
        )
    }
    request(requrl, opts, res => {
      let data = ''
      res.on('data', ch => data += ch)
      res.on('end', () => {
        resolve(JSON.parse(data))
      })
      res.on('error', reject)
    })
  })

export default fetch
