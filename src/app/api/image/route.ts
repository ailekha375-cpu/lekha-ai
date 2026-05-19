import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies image requests so the chat can display blob/external URLs inline.
 * Browser requests /api/image?url=... and gets the image from the same origin (avoids CORS/403 in img tag).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url || !url.startsWith('http')) {
    return new NextResponse('Missing or invalid url', { status: 400 });
  }
  try {
    const res = await fetch(url, {
      headers: { Accept: 'image/*' },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }
    const contentType = res.headers.get('content-type') || 'image/png';
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    console.error('[image] proxy failed:', err);
    return new NextResponse(null, { status: 502 });
  }
}
