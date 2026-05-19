import { NextRequest, NextResponse } from 'next/server';

const AZURE_FUNCTION_URL = process.env.AZURE_FUNCTION_URL;

function getSendUrl(eventId: string) {
  if (!AZURE_FUNCTION_URL) {
    throw new Error('Server misconfiguration: AZURE_FUNCTION_URL not set');
  }
  const { origin, search } = new URL(AZURE_FUNCTION_URL);
  return `${origin}/api/events/${eventId}/send${search}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const bearerToken = request.headers.get('Authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (bearerToken) {
      headers.Authorization = bearerToken;
    }

    const res = await fetch(getSendUrl(eventId), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
