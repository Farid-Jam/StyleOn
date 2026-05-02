import type { NextRequest } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.GCP_PROJECT_ID ?? 'syleon';
const LOCATION = process.env.GCP_LOCATION ?? 'global';
const IMAGE_MODEL = process.env.VERTEX_IMAGE_MODEL ?? 'gemini-3.1-flash-image-preview';

let auth: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (!auth) {
    const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY;
    if (!keyJson) throw new Error('GCP_SERVICE_ACCOUNT_KEY is not set.');
    auth = new GoogleAuth({
      credentials: JSON.parse(keyJson),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }
  return auth;
}

interface BodyMetrics {
  build: string;
  shoulderWidth: string;
  hipWidth: string;
  shoulderToHipRatio: string;
  torsoLength: string;
}

interface RequestBody {
  personImage: string;
  garmentImage: string;
  size?: string | null;
  height?: string | null;
  bodyMetrics?: BodyMetrics | null;
}

function buildTryOnPrompt({ size, height, bodyMetrics }: Pick<RequestBody, 'size' | 'height' | 'bodyMetrics'>) {
  let sizeGuidance = '';
  if (size && bodyMetrics) {
    const m = bodyMetrics;
    sizeGuidance = `
- SIZING IS CRITICAL. The person's measured body proportions (via pose estimation):
  • Build: ${m.build}
  • Shoulder-width-to-height ratio: ${m.shoulderWidth}
  • Hip-width-to-height ratio: ${m.hipWidth}
  • Shoulder-to-hip ratio: ${m.shoulderToHipRatio}
  • Torso-length-to-height ratio: ${m.torsoLength}${height ? `\n  • Height: ${height}` : ''}
  They are trying on size ${size}. Based on their ${m.build} build, render the garment fit realistically:
  - If size ${size} is too large for their body: show visibly loose/baggy fabric, excess material bunching, sleeves or hems that are too long.
  - If size ${size} is too small for their body: show the fabric pulling tight, stretching at seams, riding up, or looking restrictive.
  - If size ${size} is a good match: show a natural, comfortable drape with proper fit.`;
  } else if (size && height) {
    sizeGuidance = `
- SIZING IS CRITICAL: The person is ${height} tall and trying on size ${size}. Render the garment fit realistically for that size on this body — too-large sizes should look baggy, too-small should look tight, a good match should drape naturally.`;
  } else if (size) {
    sizeGuidance = `
- SIZING IS CRITICAL: The person is trying on size ${size}. Render the garment fit realistically — too-large sizes should look baggy with excess fabric, too-small sizes should look tight and stretched.`;
  }

  return `You will receive two images: the FIRST is a person, the SECOND is a clothing garment.

Generate a single new photograph of the SAME person from the first image wearing the garment from the second image. Critical requirements:
- Preserve the person's face, hair, identity, skin tone, and body proportions exactly.
- Preserve the person's pose, camera angle, and the original background.
- Match the lighting, shadows, and color temperature of the original photo so the garment looks naturally worn.${sizeGuidance}
- Drape the garment realistically — natural folds, fit, and contact with the body.
- Do not alter the person's face or add any text, watermarks, or logos.

Return only the resulting image.`;
}

function stripDataUrlPrefix(b64: string) {
  const comma = b64.indexOf(',');
  return b64.startsWith('data:') && comma !== -1 ? b64.slice(comma + 1) : b64;
}

function detectMimeFromBase64(b64: string) {
  const head = b64.slice(0, 16);
  if (head.startsWith('/9j/')) return 'image/jpeg';
  if (head.startsWith('iVBORw0KGgo')) return 'image/png';
  if (head.startsWith('R0lGOD')) return 'image/gif';
  if (head.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

function inlineImagePart(base64: string) {
  const data = stripDataUrlPrefix(base64);
  return {
    inline_data: {
      mime_type: detectMimeFromBase64(data),
      data,
    },
  };
}

interface VertexResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string; inlineData?: { data?: string }; inline_data?: { data?: string } }> };
  }>;
}

function extractImageBase64(json: VertexResponse) {
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) return inline.data;
  }
  return null;
}

function extractText(json: VertexResponse) {
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text).filter(Boolean).join('\n').trim();
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let token: string;
  try {
    token = (await getAuth().getAccessToken()) ?? '';
    if (!token) throw new Error('Empty token');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `GCP auth failed: ${msg}` }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { personImage, garmentImage, size, height, bodyMetrics } = body;
  if (!personImage || !garmentImage) {
    return Response.json({ error: 'Both personImage and garmentImage are required.' }, { status: 400 });
  }

  const prompt = buildTryOnPrompt({ size, height, bodyMetrics });
  const url = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${IMAGE_MODEL}:generateContent`;

  const upstreamBody = {
    contents: [
      {
        role: 'user',
        parts: [inlineImagePart(personImage), inlineImagePart(garmentImage), { text: prompt }],
      },
    ],
    generation_config: { response_modalities: ['IMAGE', 'TEXT'] },
  };

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(upstreamBody),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `Network error reaching Vertex AI: ${msg}` }, { status: 502 });
  }

  if (!upstream.ok) {
    let message = `Vertex AI request failed (${upstream.status})`;
    if (upstream.status === 401 || upstream.status === 403) {
      message = 'Vertex AI auth failed. Check that GCP_SERVICE_ACCOUNT_KEY is set correctly and the service account has the Vertex AI User role.';
    }
    try {
      const errBody = await upstream.json();
      const detail = errBody?.error?.message ?? errBody?.[0]?.error?.message;
      if (detail) message = detail;
    } catch {
      /* swallow */
    }
    return Response.json({ error: message }, { status: upstream.status });
  }

  const json = (await upstream.json()) as VertexResponse;
  const finishReason = json.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    return Response.json(
      { error: `Generation stopped: ${finishReason}. Try a clearer full-body photo with good lighting, and a clean shot of the garment.` },
      { status: 500 },
    );
  }

  const imageB64 = extractImageBase64(json);
  if (!imageB64) {
    const text = extractText(json);
    return Response.json(
      { error: text || 'Try a clearer full-body photo with good lighting, and a clean shot of the garment.' },
      { status: 500 },
    );
  }

  return Response.json({ image: `data:image/png;base64,${imageB64}` });
}
