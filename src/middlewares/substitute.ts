import { Composer } from "../composer.js";
import { messageIsReply } from "../guards/index.js";
import { log } from "../logger.js";

type ParsedQuery = {
  rawFrom: string;
  rawTo: string;
  flags: string | undefined;
  isStrict: boolean;
  sep: string;
  deleteFlag: boolean;
  indexes?: number[];
};

function parseSedQuery(q: string): ParsedQuery | undefined {
  // Determine which character is used as a separator
  // s#foo#bar    s/(.+)/\1$&/gi
  //  ^   ^        ^    ^    ^
  let sep = q.match(/^s!?([/#@|+\-"'])/)?.[1];
  if (!sep) return;
  if ("|+".includes(sep)) sep = `\\${sep}`;
  const parseQueryRe = new RegExp(
    String.raw`^s(!)?${sep}((?:\\${sep}|[^${sep}])+)${sep}((?:\\${sep}|[^${sep}])*)(?:${sep}(\d+(?:,\d+)*)?([gimsud]*))?$`,
  );
  const sedQueryMatch = q.match(parseQueryRe);
  if (!sedQueryMatch) return;
  type SedQueryMatch = [
    string, // Full match
    string | undefined,
    string,
    string,
    string | undefined,
    string | undefined,
  ];
  const [, strictFlag, rawFrom, rawTo, indexesRaw, flags] =
    sedQueryMatch as SedQueryMatch;
  const isStrict = strictFlag === "!";
  return {
    rawFrom: rawFrom,
    rawTo: rawTo,
    flags,
    isStrict,
    sep,
    deleteFlag: flags?.includes("d") ?? false,
    indexes: indexesRaw?.split(",").map((s) => parseInt(s)),
  };
}

export function applySedQueries(
  inputText: string,
  queries: string[],
): { text: string; deleteFlag: boolean } | undefined {
  let nValidQueries = 0;
  let deleteFlag = false;
  for (const sedQuery of queries) {
    const parsedQuery = parseSedQuery(sedQuery);
    if (!parsedQuery) continue;
    log.info({ query: parsedQuery }, "Sed query");
    if (parsedQuery.deleteFlag) deleteFlag = true;
    try {
      if (parsedQuery.indexes && !parsedQuery.flags?.includes("g")) {
        // When capture indexes are specified in the end, always use global flag
        parsedQuery.flags ??= "";
        parsedQuery.flags += "g";
      }
      const replaceFrom = new RegExp(parsedQuery.rawFrom, parsedQuery.flags);
      let captureIndex = 0;
      const newText = inputText.replace(replaceFrom, (...args) => {
        captureIndex += 1;
        if (parsedQuery.indexes && !parsedQuery.indexes.includes(captureIndex))
          return args[0];
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_function_as_a_parameter
        const capGroups = args.slice(
          0,
          args.findIndex((it) => typeof it === "number"),
        );
        return parsedQuery.rawTo.replace(
          /[\\$](?:(&|\d+)|\{(&|\d+)\})/g,
          (fullMatch, groupIndex1, groupIndex2) => {
            // groupIndex1 is for indexes w/o braces, i.e. $0, \1
            // groupIndex2 is for braces, i.e. ${0}, \{1}
            let groupIndex = groupIndex1 ?? groupIndex2;
            if (groupIndex === "&") groupIndex = 0;
            return capGroups[groupIndex] ?? fullMatch;
          },
        );
      });
      if (parsedQuery.isStrict && newText === inputText) return;
      inputText = newText;
      nValidQueries++;
    } catch {
      // Ignore
    }
  }
  if (nValidQueries < queries.length) {
    return;
  }
  return { text: inputText, deleteFlag };
}

function runSubstituteOnText(text: string, substitute: string) {
  const sedQueries = substitute
    .split("\n")
    .map((q) => q.trim())
    .filter((q) => q.startsWith("s"));
  if (sedQueries.length === 0) return;
  return applySedQueries(text, sedQueries);
}

const composer = new Composer();

export default composer;

composer.on("edited_message:text", async (ctx, next) => {
  const key = `substitute:${ctx.editedMessage.message_id}`;
  const replyMessageId = await ctx.dbStore.redisClient
    .get(key)
    .then((raw) => (raw ? parseInt(raw) : undefined));
  if (replyMessageId === undefined) return next();
  const reply = ctx.editedMessage.reply_to_message;
  if (!reply) return next();
  const inputText = reply.text ?? reply.caption;
  if (!inputText) return next();
  const subResult = runSubstituteOnText(inputText, ctx.editedMessage.text);
  if (!subResult) return next();
  await ctx.api.editMessageText(ctx.chat.id, replyMessageId, subResult.text);
});

composer.filter(messageIsReply).on("message:text", async (ctx, next) => {
  const reply = ctx.message.reply_to_message;
  const inputText = reply.text ?? reply.caption;
  if (!inputText) return next();
  const subResult = runSubstituteOnText(inputText, ctx.message.text);
  if (!subResult) return next();
  const sent = await ctx.reply(subResult.text, {
    reply_to_message_id: reply.message_id,
  });
  await ctx.dbStore.redisClient.set(
    `substitute:${ctx.message.message_id}`,
    sent.message_id,
  );
  if (ctx.dbChat?.delete_substitute_prompt || subResult.deleteFlag) {
    try {
      await ctx.deleteMessage();
    } catch (err) {
      ctx.log.error(err);
    }
  }
  // if (ctx.from.id !== ctx.botCreatorId) {
  //   const delay = 5 * 60; // 5 mins
  //   await ctx.eventQueue.pushDelayed(delay, "delete_message", {
  //     chatId: ctx.chat.id,
  //     messageId: ctx.message.message_id,
  //   });
  //   await ctx.eventQueue.pushDelayed(delay, "delete_message", {
  //     chatId: ctx.chat.id,
  //     messageId: sent.message_id,
  //   });
  // }
});
