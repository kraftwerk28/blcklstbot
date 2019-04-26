import { request } from 'https'
import { stringify as qsstr } from 'querystring'

const fetch = (url, queryData, options) =>
  new Promise((resolve, reject) => {
    const opts = {
      method: 'GET',
      ...options
    }

    let requrl = url
    if (queryData && opts.method === 'GET') {
      requrl += `?${qsstr(queryData)}`
    }

    const reqst = request(requrl, opts, res => {
      if (res.statusCode.toString()[0] !== '2') {
        reject('Bad status code (not 2xx)')
        return
      }
      let data = ''
      res.on('data', ch => data += ch)
      res.on('end', () => {
        resolve(JSON.parse(data))
      })
      res.on('error', reject)
    })

    reqst.end()
  })

export default fetch
