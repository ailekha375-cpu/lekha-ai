import { NextRequest, NextResponse } from 'next/server';
import { buildAzureRoute, proxyAzureJson } from '../../../_azureProxy';

export const dynamic = 'force-dynamic';

function getSendUrl(eventId: string) {
  return buildAzureRoute(`/api/events/${eventId}/send`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    return await proxyAzureJson(request, getSendUrl(eventId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
