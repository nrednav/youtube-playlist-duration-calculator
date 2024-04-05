import { EnUploadDateParser } from "./en";
import { EsUploadDateParser } from "./es";
import { ZhHansCnUploadDateParser } from "./zh-Hans-CN";

const UPLOAD_DATE_PARSERS_BY_LOCALE = {
  "en": EnUploadDateParser,
  "en-GB": EnUploadDateParser,
  "en-US": EnUploadDateParser,
  "es-ES": EsUploadDateParser,
  "es-419": EsUploadDateParser,
  "es-US": EsUploadDateParser,
  "zh-Hans-CN": ZhHansCnUploadDateParser
};

/** @param {string} locale */
export const getUploadDateParser = (locale) => {
  return UPLOAD_DATE_PARSERS_BY_LOCALE[locale] ?? EnUploadDateParser;
};

export const getSupportedLocales = () =>
  Object.keys(UPLOAD_DATE_PARSERS_BY_LOCALE);
