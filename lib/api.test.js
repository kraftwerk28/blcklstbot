require('dotenv').config()
const { get } = require('https')
const { stringify } = require('querystring')

get(
  'https://bots.genix.space/api/blacklist/deluser?' +
  stringify({
    token: process.env.API_TOKEN,
    id: 539991741
  }), res => {
    let data = ''
    res.on('data', ch => data += ch)
    res.on('end', () => {
      console.log(data)
    })
  }
)
