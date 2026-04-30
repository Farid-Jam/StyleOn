import type { NextRequest } from 'next/server';

const STYLEON_API = process.env.STYLEON_API_URL ?? 'http://localhost:3001';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  try {
    const upstream = await fetch(`${STYLEON_API}/api/products${search}`, {
      cache: 'no-store',
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: `Could not reach the inventory server. ${msg}` },
      { status: 502 },
    );
  }
}
