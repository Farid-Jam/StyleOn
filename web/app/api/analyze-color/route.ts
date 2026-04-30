import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import type { NextRequest } from 'next/server';
import type { AnalysisResult } from '../../lib/types';

interface RequestBody {
  skin_hex: string;
  eye_hex: string;
  hair_hex: string;
}

// Strict JSON schema — cast via unknown because TypeScript widens enum members
// in object literals (SchemaType.OBJECT inferred as SchemaType, not its literal).
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    season:           { type: SchemaType.STRING },
    description:      { type: SchemaType.STRING },
    undertone:        { type: SchemaType.STRING },
    contrast:         { type: SchemaType.STRING },
    metal:            { type: SchemaType.STRING },
    best_colors:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    best_hair_colors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    avoid_colors:     { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ['season', 'description', 'undertone', 'contrast', 'metal', 'best_colors', 'best_hair_colors', 'avoid_colors'],
} as unknown as Schema;

function isValidHex(s: string) {
  return typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GOOGLE_API_KEY (or GEMINI_API_KEY) not configured' }, { status: 500 });
  }

  let body: Partial<RequestBody>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { skin_hex, eye_hex, hair_hex } = body;
  if (!isValidHex(skin_hex!) || !isValidHex(eye_hex!) || !isValidHex(hair_hex!)) {
    return Response.json(
      { error: 'skin_hex, eye_hex, and hair_hex must be valid 6-digit hex codes' },
      { status: 400 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel(
    {
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    },
    { apiVersion: 'v1beta' }
  );

  const prompt = `You are an expert color season analyst with deep knowledge of the 12-season system:
True Spring, Light Spring, Warm Spring, True Summer, Light Summer, Cool Summer,
True Autumn, Soft Autumn, Warm Autumn, True Winter, Cool Winter, Dark Winter.

Measured color data extracted from the person's face via computer vision:
  Skin tone : ${skin_hex}
  Eye color : ${eye_hex}
  Hair color: ${hair_hex}

Using only these hex values, determine their color season. Consider:
• Warm vs cool undertone in the skin hex
• Overall depth (light → dark) across all three values
• Contrast level between features
• Whether coloring reads as muted/soft or vivid/clear

Return ALL of the following fields:
• "season"           – exact season name (e.g. "True Winter")
• "description"      – 2–3 sentences explaining the diagnosis, citing the hex values directly
• "undertone"        – exactly one word: "Warm", "Cool", or "Neutral"
• "contrast"         – exactly one word: "High", "Medium", or "Low"
• "metal"            – best jewelry metal: "Gold", "Silver", "Rose Gold", or "Both"
• "best_colors"      – exactly 5 hex codes for clothing and accent colors that harmonise with this palette
• "best_hair_colors" – exactly 4 hex codes for flattering natural or dyed hair colors
• "avoid_colors"     – exactly 3 hex codes that clash with or wash out this palette

All hex codes must be 6-digit lowercase (e.g. #a3c4e2).`;

  try {
    const result = await model.generateContent(prompt);
    const json: AnalysisResult = JSON.parse(result.response.text());
    return Response.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[analyze-color]', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
