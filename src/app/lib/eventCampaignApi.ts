import type {
  EventCampaignKit,
  EventRecord,
  LinkedChatSummary,
  SavedEmailDraft,
  SavedInviteAsset,
} from './eventTypes';

async function authedFetch(
  path: string,
  idToken: string,
  init?: RequestInit
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(path, {
    ...init,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function loadCampaignKit(eventId: string, idToken: string): Promise<EventCampaignKit> {
  try {
    const data = await authedFetch(`/api/events/${eventId}/campaign-kit`, idToken);
    return (
      data?.campaignKit || {
        inviteAsset: null,
        emailDraft: null,
        linkedChats: [],
        updatedAt: null,
      }
    ) as EventCampaignKit;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('404') || message.toLowerCase().includes('not found')) {
      return {
        inviteAsset: null,
        emailDraft: null,
        linkedChats: [],
        updatedAt: null,
      };
    }
    throw error;
  }
}

export async function saveCampaignKitPatch(
  eventId: string,
  idToken: string,
  patch: Partial<EventCampaignKit>
): Promise<{ campaignKit: EventCampaignKit; event: EventRecord }> {
  const data = await authedFetch(`/api/events/${eventId}/campaign-kit`, idToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignKit: patch }),
  });
  return data as { campaignKit: EventCampaignKit; event: EventRecord };
}

export async function saveInviteAssetToEvent(
  eventId: string,
  idToken: string,
  asset: SavedInviteAsset
): Promise<{ campaignKit: EventCampaignKit; event: EventRecord }> {
  return saveCampaignKitPatch(eventId, idToken, { inviteAsset: asset });
}

export async function saveEmailDraftToEvent(
  eventId: string,
  idToken: string,
  emailDraft: SavedEmailDraft
): Promise<{ campaignKit: EventCampaignKit; event: EventRecord }> {
  return saveCampaignKitPatch(eventId, idToken, { emailDraft });
}

export async function linkChatToEvent(
  eventId: string,
  idToken: string,
  chat: LinkedChatSummary
): Promise<{ campaignKit: EventCampaignKit; event: EventRecord }> {
  return saveCampaignKitPatch(eventId, idToken, { linkedChats: [chat] });
}
