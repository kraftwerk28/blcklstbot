import * as db from "../lib/db";
import { config } from "dotenv";

config();

(async () => {
  const client = await db.connect();
  try {
    console.log(await db.getChat({ id: 44322 } as any));
    await db.addChat({ id: 1122, title: "lol" } as any);
    console.log(await db.getChats());
    await db.updateChatProp({ id: 1122 } as any, "title", (s) => s + "_");
    console.log(await db.getChats());
  } catch (e) {
    console.error(e);
  }
  await db.disconnect();
})();
