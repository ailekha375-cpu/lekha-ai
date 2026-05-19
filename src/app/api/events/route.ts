import { NextRequest, NextResponse } from 'next/server';

import type { EventRecord } from '@/app/lib/eventTypes';

const AZURE_FUNCTION_URL = process.env.AZURE_FUNCTION_URL;

function getEventsUrl() {
  if (!AZURE_FUNCTION_URL) {
    throw new Error('Server misconfiguration: AZURE_FUNCTION_URL not set');
  }
  const { origin, search } = new URL(AZURE_FUNCTION_URL);
  return `${origin}/api/events${search}`;
}

async function proxyJson(
  request: NextRequest,
  init: RequestInit
) {
  const bearerToken = request.headers.get('Authorization');
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (bearerToken) {
    headers.Authorization = bearerToken;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(getEventsUrl(), { ...init, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Backend request timed out while loading events.' }, { status: 504 });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

export async function GET(request: NextRequest) {
  try {
    return await proxyJson(request, { method: 'GET' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<EventRecord>;
    return await proxyJson(request, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
