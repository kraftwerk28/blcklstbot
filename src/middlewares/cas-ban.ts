import { Composer } from "../composer.js";
import {
  botHasSufficientPermissions,
  chatMemberJoined,
} from "../guards/index.js";

const composer = new Composer();

composer
  .chatType(["group", "supergroup"])
  .on("chat_member")
  .filter((ctx) => ctx.dbChat.use_cas_ban)
  .filter(chatMemberJoined)
  .filter(botHasSufficientPermissions)
  .use(async (ctx, next) => {
    try {
      ctx.log.info("Checking for CAS ban");
      // NOTE: see https://cas.chat/api
      const casServiceResponse = await fetch(
        `https://api.cas.chat/check?user_id=${ctx.from.id}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(3000),
        },
      );
      const data: { ok: boolean } = await casServiceResponse.json();
      ctx.log.debug({ cas: data }, "CAS response");
      if (!data.ok) return next();
      await ctx.banUser(ctx.from, undefined, "CAS blocklist");
    } catch (err) {
      ctx.log.error(err, "Failed to check user in CAS API");
      return next();
    }
  });

export default composer;
