import Telegraf, { ContextMessageUpdate } from 'telegraf';

export async function flushUpdates(bot: Telegraf<ContextMessageUpdate>) {
  await bot.telegram.deleteWebhook();

  async function getUpdateRec(lastUpdateID: number): Promise<void> {
    const newUpdates = await bot.telegram.getUpdates(
      undefined,
      100,
      lastUpdateID
    );

    if (newUpdates.length > 0) {
      lastUpdateID = newUpdates[newUpdates.length - 1].update_id;
      console.log(`Fetched old updates [id: ${lastUpdateID}].`);
      return getUpdateRec(lastUpdateID + 1);
    }
  }

  return getUpdateRec(0);
}
