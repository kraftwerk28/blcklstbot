import Telegraf, { ContextMessageUpdate } from "telegraf";

/**
 * @param {Telegraf} bot
 * @param {Function} callback
 */
const eat = async (bot: Telegraf<ContextMessageUpdate>) => {
  await bot.telegram.deleteWebhook();
  let lastUpdateID = 0;

  const getUpdateRec = async () => {
    const newUpdate =
      await (bot.telegram.getUpdates as any)(undefined, 100, lastUpdateID + 1);

    if (newUpdate.length > 0) {
      lastUpdateID = newUpdate[newUpdate.length - 1].update_id;
      console.log(`Fetched old updates [id: ${lastUpdateID}].`);
      getUpdateRec();
    } else {
      return;
    }
  };

  getUpdateRec();
};

export default eat;
