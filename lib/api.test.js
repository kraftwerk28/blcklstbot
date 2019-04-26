require('dotenv').config()
const { get } = require('https')
const { stringify } = require('querystring')
const URL = 'https://bots.genix.space/api/blacklist?token=' +
  process.env.API_TOKEN

get(URL, res => {
  let data = ''
  res.on('data', ch => data += ch)
  res.on('end', () => {
    console.dir(JSON.parse(data))
  })
})
