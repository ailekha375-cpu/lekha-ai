import { NextRequest, NextResponse } from 'next/server';
import { buildAzureRoute, proxyAzureJson } from '../_azureProxy';

export const dynamic = 'force-dynamic';

function getContactsUrl() {
  return buildAzureRoute('/api/contacts');
}

export async function GET(request: NextRequest) {
  try {
    return await proxyAzureJson(request, getContactsUrl(), {
      method: 'GET',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await proxyAzureJson(request, getContactsUrl(), {
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
