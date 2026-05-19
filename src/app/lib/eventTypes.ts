export type LinkedChatSummary = {
  conversationId: string;
  title: string;
  updatedAt: string;
};

export type SavedInviteAsset = {
  src: string;
  updatedAt: string;
  sourceConversationId?: string | null;
  variant: 'template' | 'final';
};

export type SavedEmailDraft = {
  content: string;
  updatedAt: string;
  sourceConversationId?: string | null;
  sourceMessageId?: string | null;
};

export type EventCampaignKit = {
  inviteAsset?: SavedInviteAsset | null;
  emailDraft?: SavedEmailDraft | null;
  linkedChats: LinkedChatSummary[];
  updatedAt?: string | null;
};

export type EventRecord = {
  id: string;
  title: string;
  eventType?: string;
  hostName?: string;
  description?: string;
  eventDate?: string | null;
  venue?: string;
  rsvpDeadline?: string | null;
  generatedTemplateUrl?: string | null;
  finalInviteUrl?: string | null;
  campaignKit?: EventCampaignKit | null;
  lastInviteSendAt?: string | null;
  lastInviteSubject?: string | null;
  sentGuestCount?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GuestRecord = {
  id: string;
  eventId: string;
  uid?: string;
  name: string;
  email: string;
  phone?: string;
  groupId?: string | null;
  isPrimaryGuest?: boolean;
  maxGuests?: number;
  guestType?: string;
  rsvpToken: string;
  inviteStatus?: string;
  inviteSentAt?: string | null;
  lastReminderAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RsvpResponseRecord = {
  id: string;
  eventId: string;
  guestId: string;
  uid?: string;
  rsvpToken: string;
  attendanceStatus: 'attending' | 'not_attending' | 'maybe';
  guestCount: number;
  mealPreference?: string;
  notes?: string;
  respondedBy?: string;
  submittedAt?: string;
  updatedAt?: string;
};

export type GuestResponseRecord = GuestRecord & {
  response?: RsvpResponseRecord | null;
};
