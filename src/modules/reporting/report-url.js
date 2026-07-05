/**
 * Builds a pre-filled Google Form URL for issue reporting.
 *
 * Pre-fills extension version, browser name, and locale. Leaving the
 * description fields blank for the user to fill in.
 *
 * Goal: let users signal breakage without an account. The form itself
 * must be configured (in Google Forms Settings > Responses) to:
 *   - Collect email addresses = Do not collect
 *   - Limit to 1 response = Off
 * Else a Google sign-in wall appears and the no-account requirement fails.
 */

const FORM_ID = "1FAIpQLSfRcroM-12GSL0B13RfvhQZqHpcJIeD4RLcUVZWYgoRlIepEg";

const FIELD_IDS = {
  extensionVersion: "516432152",
  browser: "597972634",
  locale: "998836863",
};

const FORM_BASE_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform`;

/**
 * Derives a short browser label from a user agent string.
 * Falls back to "Unknown" if no known browser signature is found.
 * Intentionally does not expose OS or full version to keep PII minimal.
 */
const detectBrowser = (userAgent) => {
  const ua = userAgent || "";
  if (ua.includes("Firefox")) {
    return "Firefox";
  }
  if (ua.includes("Edg")) {
    return "Edge";
  }
  if (ua.includes("OPR") || ua.includes("Opera")) {
    return "Opera";
  }
  if (ua.includes("Chrome")) {
    return "Chrome";
  }
  if (ua.includes("Safari")) {
    return "Safari";
  }
  return "Unknown";
};

/**
 * Builds the pre-filled Google Form URL.
 */
export const buildReportUrl = ({ extensionVersion, userAgent, locale }) => {
  const params = new URLSearchParams();
  params.set("usp", "pp_url");
  params.set(
    `entry.${FIELD_IDS.extensionVersion}`,
    extensionVersion || "unknown",
  );
  params.set(`entry.${FIELD_IDS.browser}`, detectBrowser(userAgent));
  params.set(`entry.${FIELD_IDS.locale}`, locale || "unknown");
  return `${FORM_BASE_URL}?${params.toString()}`;
};

export { detectBrowser };
