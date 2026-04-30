import type { AnalysisResult } from './types';
import type { Product } from './styleon';

export const COLOR_HEX: Record<string, string> = {
  'antique gold': '#C9A646',
  aqua: '#00FFFF',
  beige: '#D8C3A5',
  berry: '#8A2D52',
  black: '#111111',
  'blue gray': '#6699CC',
  burgundy: '#800020',
  'burnt orange': '#CC5500',
  camel: '#C19A6B',
  charcoal: '#36454F',
  cobalt: '#0047AB',
  'cool gray': '#8C92AC',
  'cool taupe': '#8B8589',
  coral: '#FF7F50',
  cream: '#FFFDD0',
  'deep navy': '#000B3D',
  'dusty blue': '#6F8FAF',
  'dusty orange': '#D98559',
  emerald: '#50C878',
  espresso: '#3C2218',
  fuchsia: '#FF00FF',
  'golden yellow': '#FFDF00',
  green: '#228B22',
  'icy blue': '#D6F0FF',
  'icy pink': '#F7DDE8',
  ivory: '#FFFFF0',
  lavender: '#B57EDC',
  'light gold': '#FDDC5C',
  mauve: '#E0B0FF',
  'muddy brown': '#6B4F2A',
  mushroom: '#B8A99A',
  mustard: '#FFDB58',
  navy: '#000080',
  'neon pink': '#FF10F0',
  'neon yellow': '#FFFF33',
  olive: '#708238',
  orange: '#FFA500',
  'optic white': '#FDFDFD',
  'pastel peach': '#FFD1B3',
  peach: '#FFE5B4',
  'pine green': '#01796F',
  plum: '#673147',
  poppy: '#E35335',
  'pure black': '#000000',
  rose: '#C08081',
  'royal purple': '#7851A9',
  ruby: '#E0115F',
  rust: '#B7410E',
  sage: '#9CAF88',
  sapphire: '#0F52BA',
  silver: '#C0C0C0',
  'slate blue': '#6A5ACD',
  'soft gray': '#B8B8B8',
  'soft navy': '#3B4C6B',
  'stark black': '#000000',
  'stark white': '#FFFFFF',
  taupe: '#8B8589',
  teal: '#008080',
  terracotta: '#E2725B',
  'true red': '#BF0A30',
  turquoise: '#40E0D0',
  'warm beige': '#D6B58C',
  'warm brown': '#8B5A2B',
  'warm gray': '#A89F91',
  'warm green': '#7BA05B',
  white: '#FFFFFF',
};

export const ANALYSIS_STORAGE_KEY = 'styleon.colorAnalysis';

export function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
  );
}

// Snowflake stringly-typed columns may arrive as JSON strings, comma lists, or arrays.
export function parseStringList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((v) => String(v));
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
}

function colorNameToRgb(name: string): [number, number, number] | null {
  const normalized = name.trim().toLowerCase().replace(/_/g, ' ');
  const hex = COLOR_HEX[normalized];
  return hex ? parseHex(hex) : null;
}

function normalizeSeason(season: string): string {
  return season.trim().toLowerCase();
}

// Threshold for considering two RGB points "close" (Euclidean distance in 0-441 range).
const NEAR_MATCH = 90;
const STRONG_MATCH = 50;

export interface ScoredProduct {
  product: Product;
  score: number;
  matchedColors: string[];
  seasonMatch: boolean;
}

export function scoreProduct(product: Product, analysis: AnalysisResult): ScoredProduct {
  const productColors = parseStringList(product.colors);
  const productSeasons = parseStringList(product.season_palette).map(normalizeSeason);

  const productRgbs: { name: string; rgb: [number, number, number] }[] = [];
  for (const name of productColors) {
    const rgb = colorNameToRgb(name);
    if (rgb) productRgbs.push({ name, rgb });
  }

  const bestRgbs = analysis.best_colors.map(parseHex).filter((v): v is [number, number, number] => v !== null);
  const avoidRgbs = analysis.avoid_colors.map(parseHex).filter((v): v is [number, number, number] => v !== null);

  let score = 0;
  const matchedColors: string[] = [];

  // Boost for season match
  const seasonMatch = productSeasons.includes(normalizeSeason(analysis.season));
  if (seasonMatch) score += 80;

  // For each product color, find its closest "best" color and "avoid" color.
  for (const { name, rgb } of productRgbs) {
    let bestDistance = Infinity;
    for (const target of bestRgbs) {
      const d = rgbDistance(rgb, target);
      if (d < bestDistance) bestDistance = d;
    }
    if (bestDistance < STRONG_MATCH) {
      score += 40;
      matchedColors.push(name);
    } else if (bestDistance < NEAR_MATCH) {
      score += 20;
      matchedColors.push(name);
    }

    let avoidDistance = Infinity;
    for (const target of avoidRgbs) {
      const d = rgbDistance(rgb, target);
      if (d < avoidDistance) avoidDistance = d;
    }
    if (avoidDistance < STRONG_MATCH) score -= 35;
    else if (avoidDistance < NEAR_MATCH) score -= 15;
  }

  return { product, score, matchedColors, seasonMatch };
}

export function rankProducts(products: Product[], analysis: AnalysisResult): ScoredProduct[] {
  return products
    .map((p) => scoreProduct(p, analysis))
    .sort((a, b) => b.score - a.score);
}
