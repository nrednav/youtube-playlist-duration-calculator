import { EnViewsParser } from "./en";
import { EsViewsParser } from "./es";
import { ZhHansCnViewsParser } from "./zh-Hans-CN";

const VIEWS_PARSERS_BY_LOCALE = {
  "en": EnViewsParser,
  "en-GB": EnViewsParser,
  "en-US": EnViewsParser,
  "es-ES": EsViewsParser,
  "es-419": EsViewsParser,
  "es-US": EsViewsParser,
  "zh-Hans-CN": ZhHansCnViewsParser
};

/** @param {string} locale */
export const getViewsParser = (locale) => {
  return VIEWS_PARSERS_BY_LOCALE[locale] ?? EnViewsParser;
};

export const getSupportedLocales = () => Object.keys(VIEWS_PARSERS_BY_LOCALE);
