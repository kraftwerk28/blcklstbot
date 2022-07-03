import { log } from "../logger";
import { OnMiddleware } from "../types";

// const substRe = /s\/((?:\\\/|[^\/])+)\/((?:\\\/|[^\/])*)(?:\/([mig]*))?(?:$|\s+)/g;

export const substitute: OnMiddleware<"text"> = async function (ctx, next) {
  const reply = ctx.message.reply_to_message;
  if (!reply || !("text" in reply)) return next();
  let finalText = reply.text;
  const sedQueries = ctx.message.text
    .split("\n")
    .map(q => q.trim())
    .filter(q => q.startsWith("s"));
  if (sedQueries.length === 0) {
    return next();
  }
  let nValidSedQueries = 0;
  for (const sedQuery of sedQueries) {
    const m = sedQuery.match(/^s\s*([/#@])/); // TODO: more characters
    const sep = m?.[1]; // Usually it's "/": s/foo/bar/
    // TODO: escape special characters before generating sed regexp
    if (!sep) continue;
    const sedRe = new RegExp(
      String.raw`^s${sep}((?:\\${sep}|[^${sep}])+)${sep}((?:\\${sep}|[^${sep}])+)(?:${sep}([mig]*))$`,
    );
    const sedQueryMatch = sedQuery.match(sedRe);
    if (!sedQueryMatch) {
      continue;
    }
    nValidSedQueries++;
    log.info(`Applying ${sedQuery} to ${finalText}`);
    try {
      const replaceFrom = new RegExp(sedQueryMatch[1], sedQueryMatch[3]);
      const replaceTo = sedQueryMatch[2].replace(/\\(\d+)/g, (_, d) =>
        parseInt(d) === 0 ? "$&" : `$${d}`,
      );
      finalText = finalText.replace(replaceFrom, replaceTo);
    } catch {
      // Ignore
    }
  }
  if (nValidSedQueries < sedQueries.length) {
    return next();
  }
  return ctx.reply(finalText, { reply_to_message_id: reply.message_id });

  // for (const match of ctx.message.text.matchAll(substRe)) {
  //   didMatch = true;
  //   const replaceTo = match[2]
  //     .replace(/\\([&\d])/g, '$$$1')
  //     .replace(/\$0/g, '$$&');
  //   try {
  //     // Catch bad regex syntax
  //     const replaceFrom = new RegExp(match[1], match[3]);
  //     finalText = finalText.replace(replaceFrom, replaceTo);
  //     log.info('Regex substitution: %O', { replaceFrom, replaceTo, finalText });
  //   } catch {}
  // }
  // if (!didMatch) return next();
  // const replyOptions = { reply_to_message_id: reply.message_id };
  // return ctx.reply(finalText, replyOptions);
};
