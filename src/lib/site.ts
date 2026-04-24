export const SITE_NAME = "MicroSaaS Factory";
export const SITE_DESCRIPTION =
  "Founder operating system for solo technical founders with public pricing, guided signup, launch control, and one workspace from first signal to revenue.";
export const SITE_OG_IMAGE_PATH = "/og.png";
export const SITE_THEME_COLOR = "#07111f";

const DEFAULT_SITE_URL = "https://microsaasfactory.io";

function normalizeSiteUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configured = process.env.MICROSAAS_FACTORY_APP_URL?.trim();
  return configured ? normalizeSiteUrl(configured) : DEFAULT_SITE_URL;
}

export function getSiteUrlObject() {
  return new URL(getSiteUrl());
}

export function toAbsoluteSiteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, getSiteUrlObject()).toString();
}
