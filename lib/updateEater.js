/**
 * @param {Telegraf} bot
 * @param {Function} callback
 */
const eat = async (bot, callback, ...args) => {
  await bot.telegram.deleteWebhook()
  let lastUpdateID = 0

  const getUpdateRec = async () => {
    const newUpdate =
      await bot.telegram.getUpdates(undefined, 100, lastUpdateID + 1)

    if (newUpdate.length > 0) {
      lastUpdateID = newUpdate[newUpdate.length - 1].update_id
      console.log('Fetched old updates... ' + lastUpdateID)
      getUpdateRec()
    } else {
      // STARTING
      return callback(...args)
    }
  }

  getUpdateRec()
}

export default eat
