import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy: GET /api/sessions → Azure Function GET /sessions
 * Returns list of conversations for the authenticated user.
 */

const AZURE_FUNCTION_URL = process.env.AZURE_FUNCTION_URL;

export async function GET(request: NextRequest) {
  if (!AZURE_FUNCTION_URL) {
    return NextResponse.json({ error: 'Server misconfiguration: AZURE_FUNCTION_URL not set' }, { status: 500 });
  }

  const baseUrl = AZURE_FUNCTION_URL.replace(/\/api\/chat$/, '');
  const sessionsUrl = `${baseUrl}/api/sessions`;

  const bearerToken = request.headers.get('Authorization');
  const headers: Record<string, string> = {};
  if (bearerToken) {
    headers['Authorization'] = bearerToken;
  }

  try {
    const res = await fetch(sessionsUrl, { method: 'GET', headers });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      console.error('[sessions] Response was not JSON:', text.slice(0, 200));
      return NextResponse.json({ error: res.ok ? 'Invalid response' : `Backend returned ${res.status}` }, { status: res.ok ? 502 : res.status });
    }

    if (!res.ok) {
      const errMsg = (data as { error?: string })?.error ?? text;
      return NextResponse.json({ error: errMsg || `Backend returned ${res.status}` }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code = (err as NodeJS.ErrnoException)?.code ?? '';
    console.error('[sessions] Request failed:', message, code || '');
    return NextResponse.json({ error: `Cannot reach backend: ${[message, code].filter(Boolean).join(' — ')}` }, { status: 502 });
  }
}
