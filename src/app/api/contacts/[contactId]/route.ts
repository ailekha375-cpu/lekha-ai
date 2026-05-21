import { NextRequest, NextResponse } from 'next/server';
import { buildAzureRoute, proxyAzureJson } from '../../_azureProxy';

export const dynamic = 'force-dynamic';

function getContactUrl(contactId: string) {
  return buildAzureRoute(`/api/contacts/${contactId}`);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params;
    const body = await request.json();
    return await proxyAzureJson(request, getContactUrl(contactId), {
      method: 'PATCH',
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params;
    return await proxyAzureJson(request, getContactUrl(contactId), {
      method: 'DELETE',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
