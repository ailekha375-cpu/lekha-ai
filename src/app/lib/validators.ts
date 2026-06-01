import type { ContactRecord } from './eventTypes';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredText(value: string, label: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    return { ok: false, message: `${label} is required.` } as const;
  }
  return { ok: true, value: cleaned } as const;
}

function optionalEmail(value: string) {
  const cleaned = value.trim();
  if (cleaned && !EMAIL_RE.test(cleaned)) {
    return { ok: false, message: 'Enter a valid email address.' } as const;
  }
  return { ok: true, value: cleaned } as const;
}

export function parsePositiveInt(value: string | number, fallback = 1, max = 10) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
}

export type EventDraftInput = {
  title: string;
  eventType: string;
  hostName: string;
  description: string;
  eventDate: string;
  venue: string;
  rsvpDeadline: string;
  finalInviteUrl: string;
};

export function validateEventDraft(input: EventDraftInput): ValidationResult<EventDraftInput> {
  const title = requiredText(input.title, 'Event title');
  if (!title.ok) return title;

  return {
    ok: true,
    value: {
      title: title.value,
      eventType: input.eventType,
      hostName: input.hostName.trim(),
      description: input.description.trim(),
      eventDate: input.eventDate,
      venue: input.venue.trim(),
      rsvpDeadline: input.rsvpDeadline,
      finalInviteUrl: input.finalInviteUrl.trim() || '/wedding.svg',
    },
  };
}

export type ContactInput = Omit<ContactRecord, 'id' | 'uid' | 'createdAt' | 'updatedAt'>;

export function validateContactInput(input: ContactInput): ValidationResult<ContactInput> {
  const name = requiredText(input.name, 'Name');
  if (!name.ok) return name;

  const email = optionalEmail(input.email || '');
  if (!email.ok) return email;

  return {
    ok: true,
    value: {
      name: name.value,
      email: email.value,
      phone: input.phone?.trim() || '',
      category: input.category?.trim() || 'friends',
      notes: input.notes?.trim() || '',
      defaultGuestCount: parsePositiveInt(input.defaultGuestCount || 1),
    },
  };
}

export function validateRecipientSelection(contactIds: string[]) {
  if (!contactIds.length) {
    return { ok: false, message: 'Select at least one contact before sending.' } as const;
  }
  return { ok: true, value: contactIds } as const;
}

export function validateSendSetup(input: {
  hasInviteAsset: boolean;
  subject: string;
  message: string;
  contactIds: string[];
}) {
  if (!input.hasInviteAsset) {
    return { ok: false, message: 'Save an invite image to this event before sending.' } as const;
  }
  if (!input.subject.trim()) {
    return { ok: false, message: 'Add an email subject before sending.' } as const;
  }
  if (!input.message.trim()) {
    return { ok: false, message: 'Add an email draft before sending.' } as const;
  }
  return validateRecipientSelection(input.contactIds);
}

export function validateRsvpInput(input: {
  respondedBy: string;
  guestCount: string;
  maxGuests: number;
}) {
  const respondedBy = requiredText(input.respondedBy, 'Your name');
  if (!respondedBy.ok) return respondedBy;

  const guestCount = Number(input.guestCount);
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > input.maxGuests) {
    return {
      ok: false,
      message: `Guest count must be between 1 and ${input.maxGuests}.`,
    } as const;
  }

  return {
    ok: true,
    value: {
      respondedBy: respondedBy.value,
      guestCount,
    },
  } as const;
}
