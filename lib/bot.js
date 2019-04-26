import Telegraf from 'telegraf'
import * as api from './api'
import eat from './updateEater'
import { createServer } from 'http'
import { commands } from './cfgLoader'
import * as middlewares from './middlewares'
import { connect as dbconnect } from './db'

const {
  BOT_TOKEN,
  BOT_TOKEN_DEV,
  NODE_ENV,
  BOT_USERNAME,
  BOT_USERNAME_DEV,
  API_TOKEN,
  BOT_HTTP_PORT,
  BOT_WEBHOOK_PORT,
  BOT_SECRET_PATH,
  BOT_URL
} = process.env
const isDev = NODE_ENV === 'development'

api.setAPIToken(API_TOKEN)

const WEBHOOK_URL = `${BOT_URL}:${BOT_WEBHOOK_PORT}${BOT_SECRET_PATH}`

const bot = new Telegraf(
  isDev ? BOT_TOKEN_DEV : BOT_TOKEN,
  {
    username: isDev ? BOT_USERNAME_DEV : BOT_USERNAME,
    telegram: {
      webhookReply: false
    }
  }
)

bot.command(commands.report, middlewares.report)
bot.command(commands.unban, middlewares.unban)
bot.command(commands.debug_info, middlewares.debugInfo)
bot.help(middlewares.help)
bot.command('get_user', middlewares.getByUsernameReply)
bot.on('new_chat_members', middlewares.newMember)
bot.on('left_chat_member', middlewares.leftMember)

const runBot = async () => {
  if (isDev) {
    bot.startPolling()
    console.log('Development bot started...')
  } else {
    await bot.telegram.setWebhook(WEBHOOK_URL).then(succ =>
      succ && console.log(`Webhook set succsessfully on ::${BOT_WEBHOOK_PORT}`)
    )

    const httpServer = createServer(bot.webhookCallback(BOT_SECRET_PATH))
    httpServer.listen(BOT_HTTP_PORT, () => {
      console.log(`Server listening on ::${BOT_HTTP_PORT}`)
    })
  }
}

async function main() {
  await eat(bot, () => {
    dbconnect().then(() => console.log('pg connected...'))
    runBot()
  })
}

main()
