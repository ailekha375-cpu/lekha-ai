import { NextRequest, NextResponse } from 'next/server';

const AZURE_FUNCTION_URL = process.env.AZURE_FUNCTION_URL;

function getRsvpUrl(token: string) {
  if (!AZURE_FUNCTION_URL) {
    throw new Error('Server misconfiguration: AZURE_FUNCTION_URL not set');
  }
  const { origin, search } = new URL(AZURE_FUNCTION_URL);
  return `${origin}/api/rsvp/${token}${search}`;
}

async function proxyRsvp(token: string, init: RequestInit) {
  const res = await fetch(getRsvpUrl(token), init);
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json(
      { error: res.ok ? 'Invalid response from backend' : `Backend returned ${res.status}` },
      { status: res.ok ? 502 : res.status }
    );
  }

  if (!res.ok) {
    const errMsg = (data as { error?: string })?.error ?? text;
    return NextResponse.json({ error: errMsg || `Backend returned ${res.status}` }, { status: res.status });
  }

  return NextResponse.json(data);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    return await proxyRsvp(token, { method: 'GET' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    return await proxyRsvp(token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
