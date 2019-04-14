import { readFileSync } from 'fs'
import { resolve } from 'path' 

const loadCfg = () => {
  const cfgPath = resolve('../bot.config.js')
  return JSON.parse(readFileSync(cfgPath, 'utf8').trim())
}

export default loadCfg
