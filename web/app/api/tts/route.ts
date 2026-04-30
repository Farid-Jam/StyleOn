import type { NextRequest } from 'next/server';

interface RequestBody {
  text: string;
}

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    return Response.json(
      { error: 'ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be configured' },
      { status: 500 }
    );
  }

  let body: Partial<RequestBody>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return Response.json({ error: 'text is required' }, { status: 400 });
  }
  if (text.length > 2500) {
    return Response.json({ error: 'text too long (max 2500 chars)' }, { status: 400 });
  }

  const upstream = await fetch(`${ELEVENLABS_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15 },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    console.error('[tts] elevenlabs error', upstream.status, detail);
    return Response.json(
      { error: `ElevenLabs request failed (${upstream.status})` },
      { status: 502 }
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}
