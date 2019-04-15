import Telegraf from 'telegraf'
import * as api from './api'
import eat from './updateEater'
import { createServer } from 'http'
import loadCfg from './cfgLoader'
import * as middlewares from './middlewares'

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

const { commands } = loadCfg()
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
bot.on('new_chat_members', middlewares.newMember)

const runBot = async () => {
  if (isDev) {
    bot.startPolling()
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
    runBot()
  })
}

main()
