import { Composer } from "../composer.js";

const composer = new Composer();

export default composer;

composer.on("message", async (ctx, next) => {
  const response = await fetch(
    `https://api.spamwat.ch/banlist/${ctx.from.id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.SPAMWATCH_TOKEN}`,
      },
    },
  );
  if (response.ok) {
    // TODO: ban user
  }
  return next();
});
