import type {
  LinkedChatSummary,
  SavedEmailDraft,
  SavedInviteAsset,
} from './eventTypes';

export type EventWorkspaceRecord = {
  eventId: string;
  inviteAsset?: SavedInviteAsset;
  emailDraft?: SavedEmailDraft;
  linkedChats: LinkedChatSummary[];
  updatedAt: string;
};

const EVENT_WORKSPACE_STORAGE_KEY = 'lekha-event-workspaces';

function readAllWorkspaces(): Record<string, EventWorkspaceRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(EVENT_WORKSPACE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, EventWorkspaceRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllWorkspaces(workspaces: Record<string, EventWorkspaceRecord>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(EVENT_WORKSPACE_STORAGE_KEY, JSON.stringify(workspaces));
}

function ensureWorkspace(
  workspaces: Record<string, EventWorkspaceRecord>,
  eventId: string
): EventWorkspaceRecord {
  return (
    workspaces[eventId] ?? {
      eventId,
      linkedChats: [],
      updatedAt: new Date().toISOString(),
    }
  );
}

export function getEventWorkspace(eventId: string): EventWorkspaceRecord | null {
  const workspaces = readAllWorkspaces();
  return workspaces[eventId] ?? null;
}

export function saveInviteAssetToWorkspace(
  eventId: string,
  asset: SavedInviteAsset
): EventWorkspaceRecord {
  const workspaces = readAllWorkspaces();
  const next = ensureWorkspace(workspaces, eventId);
  next.inviteAsset = asset;
  next.updatedAt = new Date().toISOString();
  workspaces[eventId] = next;
  writeAllWorkspaces(workspaces);
  return next;
}

export function saveEmailDraftToWorkspace(
  eventId: string,
  emailDraft: SavedEmailDraft
): EventWorkspaceRecord {
  const workspaces = readAllWorkspaces();
  const next = ensureWorkspace(workspaces, eventId);
  next.emailDraft = emailDraft;
  next.updatedAt = new Date().toISOString();
  workspaces[eventId] = next;
  writeAllWorkspaces(workspaces);
  return next;
}

export function linkConversationToWorkspace(
  eventId: string,
  chat: LinkedChatSummary
): EventWorkspaceRecord {
  const workspaces = readAllWorkspaces();
  const next = ensureWorkspace(workspaces, eventId);
  next.linkedChats = [
    chat,
    ...next.linkedChats.filter((entry) => entry.conversationId !== chat.conversationId),
  ].slice(0, 8);
  next.updatedAt = new Date().toISOString();
  workspaces[eventId] = next;
  writeAllWorkspaces(workspaces);
  return next;
}
