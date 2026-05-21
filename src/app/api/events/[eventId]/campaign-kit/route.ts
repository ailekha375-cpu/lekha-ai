import { NextRequest, NextResponse } from 'next/server';
import { buildAzureRoute, proxyAzureJson } from '../../../_azureProxy';

export const dynamic = 'force-dynamic';

function getCampaignKitUrl(eventId: string) {
  return buildAzureRoute(`/api/events/${eventId}/campaign-kit`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    return await proxyAzureJson(request, getCampaignKitUrl(eventId), { method: 'GET' });
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
    return await proxyAzureJson(request, getCampaignKitUrl(eventId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
