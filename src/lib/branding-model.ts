/**
 * What the shop decides about how its storefront looks and reads (identity, theme, benefits, social links, pages).
 * All of it comes from the API (`/api/v1/TenantLanding/branding`, managed in the admin under Settings); nothing here is a shop's own data.
 * Pure functions only (no browser, no server), so every rule is tested.
 */
import type { ThemeTokens } from "@/lib/theme";

export const BENEFIT_ICONS = ["headset", "return", "shield", "globe", "truck", "gift", "lock", "star", "heart", "card"] as const;
export type BenefitIcon = (typeof BENEFIT_ICONS)[number];

/** The icon-font class of the storefront for each benefit icon the admin offers. */
const BENEFIT_ICON_CLASS: Record<BenefitIcon, string> = {
  headset: "icon-phone-call",
  return: "icon-return",
  shield: "icon-guarantee",
  globe: "icon-earth",
  truck: "icon-delivery-truck",
  gift: "icon-bag",
  lock: "icon-user-shield",
  star: "icon-check-circle",
  heart: "icon-heart",
  card: "icon-credit-card",
};

export type BrandingBenefit = { icon: BenefitIcon; title: string; description: string };
export type BrandingSocial = { platform: string; name: string; url: string };
export type BrandingPage = { key: string; title: string };

export type Branding = {
  shopName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  copyright: string | null;
  newsletterText: string | null;
  theme: { preset: string; colors: Partial<ThemeTokens> };
  benefits: BrandingBenefit[];
  social: BrandingSocial[];
  pages: BrandingPage[];
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const THEME_KEYS: (keyof ThemeTokens)[] = ["black", "secondary", "secondary2", "surface", "line", "red", "purple", "green", "success", "yellow", "pink"];
const MAX_BENEFITS = 6;

/** What is shown while the API cannot be reached (or before a shop has set anything): the shop name from the build settings, no contact details. */
export function defaultBranding(shopName: string): Branding {
  return { shopName: shopName || "Our Store", email: null, phone: null, address: null, copyright: null, newsletterText: null, theme: { preset: "classic", colors: {} }, benefits: [], social: [], pages: [] };
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  return t.length === 0 ? null : t.slice(0, max);
}

/** Only real web addresses are ever used as a link target ("javascript:" and the like are dropped). */
export function safeWebUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The API's answer (the `Data` part) turned into something the pages can trust. Anything unexpected is dropped, never thrown. */
export function parseBranding(raw: unknown, fallbackName: string): Branding {
  const base = defaultBranding(fallbackName);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  const colors: Partial<ThemeTokens> = {};
  const theme = (r.Theme ?? {}) as Record<string, unknown>;
  const rawColors = (theme.Colors ?? {}) as Record<string, unknown>;
  for (const key of THEME_KEYS) {
    const value = rawColors[key];
    if (typeof value === "string" && HEX.test(value.trim())) colors[key] = value.trim();
  }

  const benefits: BrandingBenefit[] = (Array.isArray(r.Benefits) ? r.Benefits : [])
    .map((b): BrandingBenefit | null => {
      const o = (b ?? {}) as Record<string, unknown>;
      const title = text(o.Title, 60);
      if (!title) return null;
      const icon = (BENEFIT_ICONS as readonly string[]).includes(String(o.Icon)) ? (o.Icon as BenefitIcon) : "star";
      return { icon, title, description: text(o.Description, 200) ?? "" };
    })
    .filter((b): b is BrandingBenefit => b !== null)
    .slice(0, MAX_BENEFITS);

  const social: BrandingSocial[] = (Array.isArray(r.Social) ? r.Social : [])
    .map((s): BrandingSocial | null => {
      const o = (s ?? {}) as Record<string, unknown>;
      const url = safeWebUrl(o.Url);
      const platform = text(o.Platform, 30)?.toLowerCase();
      if (!url || !platform) return null;
      return { platform, name: text(o.Name, 30) ?? platform, url };
    })
    .filter((s): s is BrandingSocial => s !== null);

  const pages: BrandingPage[] = (Array.isArray(r.Pages) ? r.Pages : [])
    .map((p): BrandingPage | null => {
      const o = (p ?? {}) as Record<string, unknown>;
      const key = text(o.Key, 20)?.toLowerCase();
      if (!key || !pageHref(key)) return null;
      return { key, title: text(o.Title, 80) ?? key };
    })
    .filter((p): p is BrandingPage => p !== null);

  return {
    shopName: text(r.ShopName, 100) ?? base.shopName,
    email: text(r.Email, 200),
    phone: text(r.Phone, 50),
    address: text(r.Address, 500),
    copyright: text(r.Copyright, 500),
    newsletterText: text(r.NewsletterText, 200),
    theme: { preset: text(theme.Preset, 30) ?? "classic", colors },
    benefits,
    social,
    pages,
  };
}

/** The storefront route of each kind of page the admin can create. */
export function pageHref(key: string): string | null {
  switch (key) {
    case "about": return "/pages/about";
    case "contact": return "/pages/contact";
    case "faq": return "/pages/faqs";
    case "returns": return "/pages/returns";
    case "delivery": return "/pages/delivery";
    case "terms": return "/pages/terms-and-conditions";
    case "privacy": return "/pages/privacy-policy";
    default: return null;
  }
}

export const COMPANY_PAGE_KEYS = ["about", "contact"];
export const LEGAL_PAGE_KEYS = ["faq", "delivery", "returns", "terms", "privacy"];

export function benefitIconClass(icon: BenefitIcon): string {
  return BENEFIT_ICON_CLASS[icon] ?? BENEFIT_ICON_CLASS.star;
}

/** A phone number for a tel: link: digits and a leading + only. */
export function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = (phone.trim().startsWith("+") ? "+" : "") + phone.replace(/\D/g, "");
  return cleaned.replace("+", "").length >= 5 ? `tel:${cleaned}` : null;
}

export function mailtoHref(email: string | null): string | null {
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : null;
}

/** The line at the very bottom of the page: the shop's own copyright text, or the name with the year. */
export function copyrightLine(branding: Branding, year: number): string {
  return branding.copyright ?? `© ${year} ${branding.shopName}. All Rights Reserved.`;
}

/** The page title for the browser tab: the page's own title with the shop name. */
export function pageTitle(shopName: string, title?: string | null): string {
  return title ? `${title} | ${shopName}` : shopName;
}
