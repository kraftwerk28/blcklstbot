import { Composer } from "../composer.js";

const composer = new Composer();

export default composer;

composer
  .command("help")
  .chatType(["group", "supergroup"])
  .use((ctx) => {
    const text = `
      <b>Generic commands</b>
      - <code>/ping XdYhZmNs [text]</code>: simple reminder
      - <code>/settings</code>: show chat settings¹
      - <code>/report [mention²] reason</code>: report (ban) a user¹

      <b>Sed emulation</b>
      Reply to a text with <a href="https://man.archlinux.org/man/sed.1.en">sed</a>-like string.
      May be repeated with newline as a separator.
      The syntax is: <code>s[!]&lt;sep&gt;&lt;regex&gt;&lt;sep&gt;&lt;replacement&gt;/[indices][flags]</code>, where
      - <code>!</code>: strict mode, if the resulting string is equal to the source text, be quiet
      - <code>sep</code>: any character from the set <code>/#@|+-"'</code>
      - <code>regex</code>: ECMAScript regular expression
      - <code>replacement</code>: text to replace <code>regex</code> with. May contain <code>\`\\42\`</code> or <code>\`\\{42}\`</code> or <code>$42</code> to insert nth capture group. <code>\`\\0\`</code>, <code>\`\\{0}\`</code>, <code>$0</code> and <code>$&</code> means the whole matched string.
      - <code>indices</code>: comma-separated list of integers that indicates which matches to perform replacement on. I.e. <code>s/a/_/2,4</code> executed on string <code>aaaa</code> will return <code>a_a_</code>
      - <code>flags</code>: set of characters from the following set:
        - <code>g</code>: global flag
        - <code>i</code>: ignore case
        - <code>m</code>: multiline mode
        - <code>s</code>: dot matches newline
        - <code>u</code>: match with full unicode
        - <code>d</code>: (try to) delete the message containing sed string

      <b>Message throttling</b>
      - <code>/mute [mention²] XdYhZmNs</code>: throttle a user, specifying the delay between their messages
      - <code>/unmute [mention²]</code>: disable throttling for a user
      - <code>/mute_list</code>: list throttled users

      ¹: the command is intended only for group admins/creators
      ²: <code>mention</code> is either a user ID, their <code>@username</code> or their Telegram full name (i.e. John Doe). If omitted, the message must be a reply to target User's message
    `
      .replace(/ {6}/g, "")
      .trim();
    const { message_id } = ctx.message;
    return ctx.reply(text, {
      reply_parameters: { message_id },
      parse_mode: "HTML",
    });
  });
