import { ChatLanguageCode, LocaleContainer } from '../types';

function getByPath(obj: any, path: string[]) {
  let result = obj;
  for (const prop of path) {
    result = result[prop];
    if (result === undefined) return result;
  }
  return result;
}

export function runI18n(
  locales: LocaleContainer,
  localeName: ChatLanguageCode,
  str: string,
  replacements: Record<string, string | number> = {},
) {
  const pathParts = str.split('.');
  const locale = locales[localeName];
  if (!locale) return str;
  let value: string = getByPath(locale, pathParts);
  if (!value) {
    // Fallback to en locale
    value = getByPath(locales['en'], pathParts);
  }
  if (!value) return str;

  return value.replace(/(?<!{){(\w+)}(?!})/g, (match, key: string) => {
    if (key in replacements) {
      return replacements[key].toString();
    } else {
      return match;
    }
  });
}

