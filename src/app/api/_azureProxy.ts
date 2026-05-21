import { NextRequest, NextResponse } from 'next/server';

const AZURE_FUNCTION_URL = process.env.AZURE_FUNCTION_URL;

export function buildAzureRoute(path: string) {
  if (!AZURE_FUNCTION_URL) {
    throw new Error('Server misconfiguration: AZURE_FUNCTION_URL not set');
  }
  const { origin, search } = new URL(AZURE_FUNCTION_URL);
  return `${origin}${path}${search}`;
}

export async function proxyAzureJson(
  request: NextRequest,
  url: string,
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
    res = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Backend request timed out. Check Azure Function health and try again.' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        error:
          'Backend unreachable from deployment. Check Vercel AZURE_FUNCTION_URL and Azure Function availability.',
      },
      { status: 502 }
    );
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

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
