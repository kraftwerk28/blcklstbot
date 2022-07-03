import { runI18n } from ".";
import { ChatLanguageCode, LocaleContainer } from "../types";

type Part =
  | { kind: "str"; str: string }
  | {
      kind: "i18n";
      str: string;
      replacements: Record<string, string | number>;
    };

export class Text {
  private parts: Part[] = [];
  constructor() {}

  line(s: string) {
    this.parts.push({ kind: "str", str: `\n${s}` });
  }

  i18n(locales: LocaleContainer, localeName: ChatLanguageCode) {
    this.parts
      .map(part => {
        switch (part.kind) {
          case "str":
            return part.str;
          case "i18n":
            return runI18n(locales, localeName, part.str, part.replacements);
        }
      })
      .join("");
  }
}
