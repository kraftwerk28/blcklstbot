'use strict'

require('dotenv').config()
import { request } from 'https'

const {
  BOT_TOKEN,
  BOT_TOKEN_DEV,
  NODE_ENV
} = process.env
const isDev = NODE_ENV === 'development'

const TOKEN = isDev ? BOT_TOKEN : BOT_TOKEN_DEV
