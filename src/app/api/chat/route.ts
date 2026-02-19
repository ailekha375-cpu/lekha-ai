import { NextRequest, NextResponse } from 'next/server';

/**
 * This route is a "proxy": it does not run your LLM or call Azure ML itself.
 * It only forwards the request from the frontend to your Azure Function and returns the Function's response.
 *
 * Flow:  Browser → POST /api/chat (this file) → Azure Function → (Function calls LLM + ML) → response back.
 *
 * Env (in .env.local):  AZURE_FUNCTION_URL = your Azure Function URL
 * Request: body { message, conversationId }; header Authorization: Bearer <Firebase ID token> (forwarded as-is).
 * conversationId: null for first message; backend returns conversationId to resume (e.g. Cosmos DB).
 */

const AZURE_FUNCTION_URL = process.env.AZURE_FUNCTION_URL;

export async function POST(request: NextRequest) {
  if (!AZURE_FUNCTION_URL) {
    return NextResponse.json(
      { error: 'Server misconfiguration: AZURE_FUNCTION_URL not set' },
      { status: 500 }
    );
  }

  let body: { message?: string; conversationId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Missing or empty "message" in body' }, { status: 400 });
  }

  const conversationId = body.conversationId === undefined ? undefined : body.conversationId;

  const bearerToken = request.headers.get('Authorization');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (bearerToken) {
    headers['Authorization'] = bearerToken;
  }

  try {
    const res = await fetch(AZURE_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, conversationId }),
    });
    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      console.error('[chat] Azure Function response was not JSON:', text.slice(0, 200));
      return NextResponse.json(
        { error: res.ok ? 'Invalid response from backend' : `Backend returned ${res.status}: ${text.slice(0, 300)}` },
        { status: res.ok ? 502 : res.status }
      );
    }

    if (!res.ok) {
      const errMsg = (data.error ?? data.message ?? text) as string;
      return NextResponse.json(
        { error: errMsg || `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code = (err as NodeJS.ErrnoException)?.code ?? '';
    console.error('[chat] Azure Function request failed:', message, code || '');
    return NextResponse.json(
      { error: `Cannot reach backend: ${[message, code].filter(Boolean).join(' — ')}` },
      { status: 502 }
    );
  }
}
