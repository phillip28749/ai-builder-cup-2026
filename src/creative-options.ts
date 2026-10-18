export const CREATIVE_DIRECTION_DESCRIPTIONS = {
  minimalist:
    "Neutral white, cream, or light gray backgrounds. Product front-and-center, clean lines, minimal props, generous negative space.",
  luxe: "Moody lighting, rich velvet, marble, or silk textures, metallic accents, deep shadows, sophisticated colors.",
  playful:
    "Bold contrasting colors, dramatic shadows, energetic composition, unexpected color combinations and playful Gen Z styling.",
  organic:
    "Natural light, earthy terracotta, sage, and cream tones, with complementary wood, plants, or linen textures.",
};
export const SHOT_TYPE_DESCRIPTIONS = {
  hero: "Hero shot: the reference subject is the star, dramatically lit, clean backdrop and subtle shadow, eye-level perspective.",
  lifestyle:
    "Lifestyle: show the subject in believable everyday use, with relevant context and optional hands. Preserve its identity.",
  flatlay:
    "Flat lay: overhead birds-eye view with complementary props, curated composition. Use overhead perspective instead of eye-level.",
  macro:
    "Macro/detail: close-up of actual textures, stitching, or craftsmanship; shallow depth of field. Crop for detail without redesigning it.",
  environmental:
    "Environmental: place the subject in a realistic location that explains its use and story, with a clear sense of place.",
};
export const AD_FORMULAS = {
  aida: "AIDA: Attention (one clear headline), Interest (specific problem or desire), Desire (supported benefit/proof), Action (one CTA).",
  pas: "PAS: Problem (relevant audience need), Agitate (explain the practical friction without fearmongering), Solution (supported product benefit), one CTA.",
  benefit:
    "Hook → Benefit → Proof → CTA: one visual hook, one concrete benefit, only supplied substantiated proof, one clear next action.",
};
export const FORMAT_DIMENSIONS = {
  square: {
    width: 1080,
    height: 1080,
    label: "Square (1080 × 1080)",
    ratio: "1:1",
  },
  story: {
    width: 1080,
    height: 1920,
    label: "Story (1080 × 1920)",
    ratio: "9:16",
  },
  portrait: {
    width: 1080,
    height: 1920,
    label: "Portrait (1080 × 1920)",
    ratio: "9:16",
  },
  landscape: {
    width: 1920,
    height: 1080,
    label: "Landscape (1920 × 1080)",
    ratio: "16:9",
  },
  custom: {
    width: 1080,
    height: 1080,
    label: "Custom dimensions",
    ratio: "1:1",
  },
} as const;
export type CreativeOptions = {
  referenceRole: "product" | "style";
  direction: keyof typeof CREATIVE_DIRECTION_DESCRIPTIONS;
  shot: keyof typeof SHOT_TYPE_DESCRIPTIONS;
  formula: keyof typeof AD_FORMULAS;
  productId: string;
  audienceId: string;
  headline: string;
  subheadline: string;
  benefit: string;
  proof: string;
  offer: string;
  cta: string;
  textOverlay: boolean;
  format: keyof typeof FORMAT_DIMENSIONS;
  width: number;
  height: number;
  templateAssetId: string;
};
export const defaultCreative: CreativeOptions = {
  referenceRole: "product",
  direction: "organic",
  shot: "hero",
  formula: "aida",
  productId: "",
  audienceId: "",
  headline: "",
  subheadline: "",
  benefit: "",
  proof: "",
  offer: "",
  cta: "Learn more",
  textOverlay: false,
  format: "square",
  width: 1080,
  height: 1080,
  templateAssetId: "",
};

export function updateCreativeOption<K extends keyof CreativeOptions>(
  current: CreativeOptions,
  key: K,
  value: CreativeOptions[K],
): CreativeOptions {
  const enteringCopy =
    ["headline", "subheadline", "offer", "cta"].includes(key) &&
    typeof value === "string" && !!value.trim();
  return {
    ...current,
    [key]: value,
    textOverlay: enteringCopy ? true : key === "textOverlay" ? Boolean(value) : current.textOverlay,
  };
}

export const SCENE_PRESETS = {
  neutral:
    "A clean neutral studio backdrop, soft directional light, crisp detail, and subtle natural shadows.",
  dark: "A dark studio backdrop, soft dramatic directional light, crisp detail, and realistic natural shadows.",
  lifestyle:
    "A tasteful everyday setting with warm natural light, believable context, and a considered composition.",
  outdoors:
    "An outdoor setting with soft daylight, natural textures, gentle shadows, and an uncluttered composition.",
};
