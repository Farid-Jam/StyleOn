const STYLEON_API = process.env.STYLEON_API_URL ?? 'http://localhost:3001';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const upstream = await fetch(
      `${STYLEON_API}/api/products/${encodeURIComponent(id)}`,
      { cache: 'no-store' },
    );
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
