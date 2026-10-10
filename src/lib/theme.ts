/**
 * Tenant theme: every colour of the shop comes from a small set of tokens, written once into CSS variables
 * (see ThemeStyle). A tenant picks a preset and can override any single colour; nothing else in the code
 * needs to change. Tokens keep the names the components already use (black = main brand/ink colour, purple =
 * accent, green = highlight ...), so the default preset looks exactly like the previous design.
 */

export type ThemeTokens = {
  /** Main brand / ink colour: buttons, headings, header. */
  black: string;
  /** Muted text. */
  secondary: string;
  secondary2: string;
  /** Page background panels. */
  surface: string;
  /** Hairlines and borders. */
  line: string;
  /** Sale / danger. */
  red: string;
  /** Accent colour: links, highlights, badges. */
  purple: string;
  /** Soft highlight (promo strips, tags). */
  green: string;
  success: string;
  yellow: string;
  pink: string;
};

export type ThemePreset = { id: string; name: string; tokens: ThemeTokens };

const base: ThemeTokens = {
  black: "#1F1F1F",
  secondary: "#696C70",
  secondary2: "#A0A0A0",
  surface: "#F7F7F7",
  line: "#E9E9E9",
  red: "#DB4444",
  purple: "#8684D4",
  green: "#D2EF9A",
  success: "#3DAB25",
  yellow: "#ECB018",
  pink: "#F4407D",
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "classic", name: "Classic", tokens: base },
  {
    id: "ocean",
    name: "Ocean",
    tokens: { ...base, black: "#0B2545", secondary: "#5B6B80", surface: "#F1F6FB", line: "#DCE6F0", purple: "#1D7AFC", green: "#BDE9F5", red: "#E5484D" },
  },
  {
    id: "emerald",
    name: "Emerald",
    tokens: { ...base, black: "#0F3D2E", secondary: "#5E6F66", surface: "#F2F8F4", line: "#DCE9E0", purple: "#14A06B", green: "#C9F2D6", red: "#DB4444" },
  },
  {
    id: "sunset",
    name: "Sunset",
    tokens: { ...base, black: "#3B1E12", secondary: "#7A6558", surface: "#FFF7F0", line: "#F0E1D4", purple: "#F2680B", green: "#FFE0B8", red: "#D6336C" },
  },
  {
    id: "royal",
    name: "Royal",
    tokens: { ...base, black: "#24104F", secondary: "#6B6486", surface: "#F6F3FC", line: "#E5DFF4", purple: "#7C3AED", green: "#E4D9FF", red: "#DB4444" },
  },
  {
    id: "rose",
    name: "Rose",
    tokens: { ...base, black: "#3A1226", secondary: "#7B6470", surface: "#FFF4F8", line: "#F3DCE6", purple: "#E11D74", green: "#FFD6E7", red: "#C81E1E" },
  },
];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** "#abc" / "#aabbcc" -> "170 187 204" (the channel form Tailwind needs for opacity such as bg-black/50). */
export function hexToChannels(hex: string): string | null {
  if (!HEX.test(hex)) return null;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function parseOverrides(raw: string | undefined): Partial<ThemeTokens> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<ThemeTokens> = {};
    for (const key of Object.keys(base) as (keyof ThemeTokens)[]) {
      const value = parsed[key];
      if (typeof value === "string" && HEX.test(value.trim())) out[key] = value.trim();
    }
    return out;
  } catch {
    return {};
  }
}

/** Preset id + optional per-colour overrides (both from server-side configuration). Unknown / invalid values are ignored. */
export function resolveTheme(presetId?: string, overridesJson?: string): ThemeTokens {
  const preset = THEME_PRESETS.find((p) => p.id === (presetId ?? "").trim().toLowerCase()) ?? THEME_PRESETS[0];
  return { ...preset.tokens, ...parseOverrides(overridesJson) };
}

/** The `:root{...}` rule that defines every token as channels (--c-x) and as a ready colour (--x). */
export function themeToCss(tokens: ThemeTokens): string {
  const lines: string[] = [];
  for (const key of Object.keys(base) as (keyof ThemeTokens)[]) {
    const channels = hexToChannels(tokens[key]) ?? hexToChannels(base[key])!;
    lines.push(`--c-${key}:${channels};--${key}:rgb(${channels});`);
  }
  return `:root{${lines.join("")}}`;
}

export function getServerTheme(): ThemeTokens {
  return resolveTheme(process.env.THEME_PRESET, process.env.THEME_OVERRIDES);
}
