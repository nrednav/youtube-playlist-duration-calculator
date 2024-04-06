import { EnViewsParser } from "./en";
import { EnInViewsParser } from "./en-IN";
import { EsViewsParser } from "./es";
import { PtViewsParser } from "./pt";
import { ZhHansCnViewsParser } from "./zh-Hans-CN";

const VIEWS_PARSERS_BY_LOCALE = {
  "en": EnViewsParser,
  "en-GB": EnViewsParser,
  "en-IN": EnInViewsParser,
  "en-US": EnViewsParser,
  "es-ES": EsViewsParser,
  "es-419": EsViewsParser,
  "es-US": EsViewsParser,
  "pt-PT": PtViewsParser,
  "pt-BR": PtViewsParser,
  "zh-Hans-CN": ZhHansCnViewsParser
};

/** @param {string} locale */
export const getViewsParser = (locale) => {
  return VIEWS_PARSERS_BY_LOCALE[locale] ?? EnViewsParser;
};

export const getSupportedLocales = () => Object.keys(VIEWS_PARSERS_BY_LOCALE);
