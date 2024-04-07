import { EnUploadDateParser } from "./en";
import { EsUploadDateParser } from "./es";
import { PtUploadDateParser } from "./pt";
import { ZhHansCnUploadDateParser } from "./zh-Hans-CN";
import { ZhHantTwUploadDateParser } from "./zh-Hant-TW";

const UPLOAD_DATE_PARSERS_BY_LOCALE = {
  "en": EnUploadDateParser,
  "en-GB": EnUploadDateParser,
  "en-IN": EnUploadDateParser,
  "en-US": EnUploadDateParser,
  "es-ES": EsUploadDateParser,
  "es-419": EsUploadDateParser,
  "es-US": EsUploadDateParser,
  "pt-PT": PtUploadDateParser,
  "pt-BR": PtUploadDateParser,
  "zh-Hans-CN": ZhHansCnUploadDateParser,
  "zh-Hant-TW": ZhHantTwUploadDateParser
};

/** @param {string} locale */
export const getUploadDateParser = (locale) => {
  return UPLOAD_DATE_PARSERS_BY_LOCALE[locale] ?? EnUploadDateParser;
};

export const getSupportedLocales = () =>
  Object.keys(UPLOAD_DATE_PARSERS_BY_LOCALE);
