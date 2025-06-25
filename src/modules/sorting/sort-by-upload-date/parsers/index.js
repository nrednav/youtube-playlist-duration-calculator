import { EnUploadDateParser } from "./en";
import { EsUploadDateParser } from "./es";
import { FrUploadDateParser } from "./fr";
import { PtUploadDateParser } from "./pt";
import { ZhHansCnUploadDateParser } from "./zh-Hans-CN";
import { ZhHantTwUploadDateParser } from "./zh-Hant-TW";

const UPLOAD_DATE_PARSERS_BY_LOCALE = {
  en: EnUploadDateParser,
  "en-GB": EnUploadDateParser,
  "en-IN": EnUploadDateParser,
  "en-US": EnUploadDateParser,
  "es-419": EsUploadDateParser,
  "es-ES": EsUploadDateParser,
  "es-US": EsUploadDateParser,
  fr: FrUploadDateParser,
  "fr-CA": FrUploadDateParser,
  "fr-FR": FrUploadDateParser,
  "pt-BR": PtUploadDateParser,
  "pt-PT": PtUploadDateParser,
  "zh-Hans-CN": ZhHansCnUploadDateParser,
  "zh-Hant-TW": ZhHantTwUploadDateParser,
};

/** @param {string} locale */
export const getUploadDateParser = (locale) => {
  return UPLOAD_DATE_PARSERS_BY_LOCALE[locale] ?? EnUploadDateParser;
};

export const getSupportedLocales = () =>
  Object.keys(UPLOAD_DATE_PARSERS_BY_LOCALE);
