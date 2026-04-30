import type { NextRequest } from 'next/server';

const PROJECT_ID = process.env.GCP_PROJECT_ID ?? 'syleon';
const LOCATION = process.env.GCP_LOCATION ?? 'global';
const VISION_MODEL = process.env.VERTEX_VISION_MODEL ?? 'gemini-2.5-flash';

interface RequestBody {
  personImage: string;
  height: string;
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

interface VertexResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = process.env.GCP_ACCESS_TOKEN;
  if (!token) {
    return Response.json(
      { error: 'GCP_ACCESS_TOKEN not set. Run `gcloud auth application-default print-access-token`.' },
      { status: 500 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { personImage, height } = body;
  if (!personImage || !height) {
    return Response.json({ error: 'personImage and height are required.' }, { status: 400 });
  }

  const data = stripDataUrlPrefix(personImage);
  const prompt = `Look at this person's photo and their height of ${height}. Estimate their body proportions — shoulder width, waist, hips relative to their height. Then given a standard clothing size chart (S: chest 34-36", M: 38-40", L: 42-44"), give a short 2-sentence fit recommendation. Be conversational, not clinical.`;

  const url = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${VISION_MODEL}:generateContent`;
  const upstreamBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: detectMimeFromBase64(data), data } },
          { text: prompt },
        ],
      },
    ],
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
    try {
      const errBody = await upstream.json();
      const detail = errBody?.error?.message;
      if (detail) message = detail;
    } catch {
      /* swallow */
    }
    return Response.json({ error: message }, { status: upstream.status });
  }

  const json = (await upstream.json()) as VertexResponse;
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text)
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!text) {
    return Response.json(
      { error: "Couldn't read the photo well enough for a fit recommendation. Try a clearer full-body photo with good lighting." },
      { status: 500 },
    );
  }

  return Response.json({ text });
}
