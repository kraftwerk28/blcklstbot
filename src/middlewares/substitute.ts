import { OnMiddleware } from "../types";

type ParsedQuery = {
  rawFrom: string;
  rawTo: string;
  flags: string;
  isStrict: boolean;
  sep: string;
};

function parseSedQuery(q: string): ParsedQuery | undefined {
  // Determine which character is used as a separator
  // s#foo#bar    s/(.+)/\1$&/gi
  //  ^   ^        ^    ^    ^
  let sep = q.match(/^s!?([/#@|+\-"'])/)?.[1];
  if (!sep) return;
  if ("|+".includes(sep)) sep = `\\${sep}`;
  const parseQueryRe = new RegExp(
    String.raw`^s(!)?${sep}((?:\\${sep}|[^${sep}])+)${sep}((?:\\${sep}|[^${sep}])*)(?:${sep}([gimsu]*))?$`,
  );
  const sedQueryMatch = q.match(parseQueryRe);
  if (!sedQueryMatch) return;
  type SedQueryMatch = [string, string, string, string, string];
  const [, strictFlag, rawFrom, rawTo, flags] = sedQueryMatch as SedQueryMatch;
  const isStrict = strictFlag === "!";
  return { rawFrom: rawFrom, rawTo: rawTo, flags, isStrict, sep };
}

export function applySedQueries(
  inputText: string,
  queries: string[],
): string | undefined {
  let nValidQueries = 0;
  for (const sedQuery of queries) {
    const parsedQuery = parseSedQuery(sedQuery);
    if (!parsedQuery) continue;
    const { rawFrom, rawTo, flags, isStrict } = parsedQuery;
    try {
      const replaceFrom = new RegExp(rawFrom, flags);
      const newText = inputText.replace(replaceFrom, (...args) => {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_function_as_a_parameter
        const capGroups = args.slice(
          0,
          args.findIndex((it) => typeof it === "number"),
        );
        return rawTo.replace(
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
      if (isStrict && newText === inputText) return;
      inputText = newText;
      nValidQueries++;
    } catch {
      // Ignore
    }
  }
  if (nValidQueries < queries.length) {
    return;
  }
  return inputText;
}

export const substitute: OnMiddleware<"text"> = async function (ctx, next) {
  const reply = ctx.message.reply_to_message;
  if (!reply) return next();

  let inputText;
  if ("text" in reply) {
    inputText = reply.text;
  } else if ("caption" in reply) {
    inputText = reply.caption;
  }
  if (!inputText) return next();

  const sedQueries = ctx.message.text
    .split("\n")
    .map((q) => q.trim())
    .filter((q) => q.startsWith("s"));
  if (sedQueries.length === 0) return next();

  const finalText = applySedQueries(inputText, sedQueries);
  if (!finalText) return next();

  const sent = await ctx.reply(finalText, {
    reply_to_message_id: reply.message_id,
  });
  if (ctx.from.id !== ctx.botCreatorId) {
    const delay = 5 * 60; // 5 mins
    await ctx.eventQueue.pushDelayed(delay, "delete_message", {
      chatId: ctx.chat.id,
      messageId: ctx.message.message_id,
    });
    await ctx.eventQueue.pushDelayed(delay, "delete_message", {
      chatId: ctx.chat.id,
      messageId: sent.message_id,
    });
  }
};
