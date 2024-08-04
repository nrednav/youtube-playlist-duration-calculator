import { EnViewsParser } from "./en";
import { EnInViewsParser } from "./en-IN";
import { EsViewsParser } from "./es";
import { FrViewsParser } from "./fr";
import { PtViewsParser } from "./pt";
import { ZhHansCnViewsParser } from "./zh-Hans-CN";
import { ZhHantTwViewsParser } from "./zh-Hant-TW";

const VIEWS_PARSERS_BY_LOCALE = {
  "en": EnViewsParser,
  "en-GB": EnViewsParser,
  "en-IN": EnInViewsParser,
  "en-US": EnViewsParser,
  "es-419": EsViewsParser,
  "es-ES": EsViewsParser,
  "es-US": EsViewsParser,
  "fr": FrViewsParser,
  "fr-CA": FrViewsParser,
  "fr-FR": FrViewsParser,
  "pt-BR": PtViewsParser,
  "pt-PT": PtViewsParser,
  "zh-Hans-CN": ZhHansCnViewsParser,
  "zh-Hant-TW": ZhHantTwViewsParser
};

/** @param {string} locale */
export const getViewsParser = (locale) => {
  return VIEWS_PARSERS_BY_LOCALE[locale] ?? EnViewsParser;
};

export const getSupportedLocales = () => Object.keys(VIEWS_PARSERS_BY_LOCALE);
