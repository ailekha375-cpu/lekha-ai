import { NextRequest, NextResponse } from 'next/server';
import { buildAzureRoute, proxyAzureJson } from '../../_azureProxy';

export const dynamic = 'force-dynamic';

function getEventUrl(eventId: string) {
  return buildAzureRoute(`/api/events/${eventId}`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    return await proxyAzureJson(request, getEventUrl(eventId), { method: 'GET' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    return await proxyAzureJson(request, getEventUrl(eventId), { method: 'DELETE' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
