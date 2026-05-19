import { NextRequest, NextResponse } from 'next/server';

const AZURE_FUNCTION_URL = process.env.AZURE_FUNCTION_URL;

function getCampaignKitUrl(eventId: string) {
  if (!AZURE_FUNCTION_URL) {
    throw new Error('Server misconfiguration: AZURE_FUNCTION_URL not set');
  }
  const { origin, search } = new URL(AZURE_FUNCTION_URL);
  return `${origin}/api/events/${eventId}/campaign-kit${search}`;
}

async function proxyCampaignKit(
  request: NextRequest,
  eventId: string,
  init: RequestInit
) {
  const bearerToken = request.headers.get('Authorization');
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (bearerToken) {
    headers.Authorization = bearerToken;
  }

  const res = await fetch(getCampaignKitUrl(eventId), { ...init, headers });
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
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    return await proxyCampaignKit(request, eventId, { method: 'GET' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    return await proxyCampaignKit(request, eventId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
