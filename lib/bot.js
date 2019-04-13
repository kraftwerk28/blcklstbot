import Telegraf from 'telegraf'
import * as api from './api'

const {
  BOT_TOKEN,
  BOT_TOKEN_DEV,
  NODE_ENV,
  BOT_USERNAME,
  BOT_USERNAME_DEV,
  API_TOKEN,
} = process.env

const isDev = NODE_ENV === 'development'

const bot = new Telegraf(
  isDev ? BOT_TOKEN : BOT_TOKEN_DEV,
  { username: isDev ? BOT_USERNAME_DEV : BOT_USERNAME }
)

api.setAPIToken(API_TOKEN)
