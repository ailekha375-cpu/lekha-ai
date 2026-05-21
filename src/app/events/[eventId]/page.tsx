'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Footer from '../../components/Footer';
import Header from '../../components/Header';
import PageBackButton from '../../components/PageBackButton';
import RecipientPickerModal from '../../components/RecipientPickerModal';
import { parseEmailDraft, sanitizeEmailDraft } from '../../lib/emailDraft';
import { loadCampaignKit, saveCampaignKitPatch } from '../../lib/eventCampaignApi';
import { buildPublicRsvpUrl } from '../../lib/publicAppUrl';
import { useAuth } from '../../lib/useAuth';
import type {
  ContactRecord,
  EventCampaignKit,
  EventRecord,
  GuestRecord,
  RsvpResponseRecord,
} from '../../lib/eventTypes';
import { getEventWorkspace } from '../../lib/eventWorkspace';

function formatInviteStatus(status?: string | null) {
  return status ? status.replace(/_/g, ' ') : 'pending';
}

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [error, setError] = useState('');
  const [loadingPage, setLoadingPage] = useState(true);
  const [campaignKit, setCampaignKit] = useState<EventCampaignKit | null>(null);
  const [responses, setResponses] = useState<RsvpResponseRecord[]>([]);
  const [sendSubject, setSendSubject] = useState('');
  const [draftEditorContent, setDraftEditorContent] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sendNotice, setSendNotice] = useState('');
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [importingExistingGuests, setImportingExistingGuests] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function loadEventData() {
      if (!user || !params?.eventId) return;
      setLoadingPage(true);
      setError('');
      try {
        const idToken = await user.getIdToken();
        const [eventRes, guestsRes, responsesRes, contactsRes, campaignKitData] = await Promise.all([
          fetch(`/api/events/${params.eventId}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          fetch(`/api/events/${params.eventId}/guests`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          fetch(`/api/events/${params.eventId}/responses`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          fetch('/api/contacts', {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          loadCampaignKit(params.eventId, idToken),
        ]);

        const eventData = await eventRes.json();
        const guestsData = await guestsRes.json();
        const responsesData = await responsesRes.json();
        const contactsData = await contactsRes.json();

        if (!eventRes.ok) throw new Error(eventData?.error || 'Failed to load event');
        if (!guestsRes.ok) throw new Error(guestsData?.error || 'Failed to load recipients');
        if (!contactsRes.ok) throw new Error(contactsData?.error || 'Failed to load contacts');

        setEvent(eventData.event);
        setGuests(Array.isArray(guestsData?.guests) ? guestsData.guests : []);
        setContacts(Array.isArray(contactsData?.contacts) ? contactsData.contacts : []);
        if (responsesRes.ok) {
          setResponses(Array.isArray(responsesData?.responses) ? responsesData.responses : []);
        } else {
          setResponses([]);
        }

        const localWorkspace = getEventWorkspace(params.eventId);
        const hasRemoteCampaignContent =
          Boolean(campaignKitData?.inviteAsset?.src) ||
          Boolean(campaignKitData?.emailDraft?.content) ||
          Boolean(campaignKitData?.linkedChats?.length);
        setCampaignKit(
          hasRemoteCampaignContent
            ? campaignKitData
            : localWorkspace
              ? {
                  inviteAsset: localWorkspace.inviteAsset ?? null,
                  emailDraft: localWorkspace.emailDraft ?? null,
                  linkedChats: localWorkspace.linkedChats ?? [],
                  updatedAt: localWorkspace.updatedAt,
                }
              : campaignKitData
        );

        const draftData = parseEmailDraft(
          campaignKitData?.emailDraft?.content ||
            localWorkspace?.emailDraft?.content ||
            '',
          eventData?.event?.lastInviteSubject || ''
        );
        setDraftEditorContent(draftData.body);
        setSendSubject(
          eventData?.event?.lastInviteSubject ||
            draftData.subject ||
            `You're invited to ${eventData?.event?.title || 'our event'}`
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setLoadingPage(false);
      }
    }

    loadEventData();
  }, [params?.eventId, user]);

  const guestRows = useMemo(
    () => [...guests].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
    [guests]
  );
  const responseStats = useMemo(
    () => ({
      total: guestRows.length,
      pending: guestRows.filter((guest) => (guest.inviteStatus || 'pending') === 'pending').length,
      responded: guestRows.filter((guest) => guest.inviteStatus === 'responded').length,
      sent: guestRows.filter((guest) => guest.inviteStatus === 'sent').length,
    }),
    [guestRows]
  );
  const responseSnapshot = useMemo(
    () => ({
      attending: responses.filter((response) => response.attendanceStatus === 'attending').length,
      maybe: responses.filter((response) => response.attendanceStatus === 'maybe').length,
      notAttending: responses.filter((response) => response.attendanceStatus === 'not_attending').length,
      totalResponses: responses.length,
    }),
    [responses]
  );
  const selectedContactIds = useMemo(
    () =>
      guestRows
        .map((guest) => guest.contactId)
        .filter((contactId): contactId is string => Boolean(contactId)),
    [guestRows]
  );
  const importableGuests = useMemo(
    () =>
      guestRows.filter(
        (guest) =>
          !guest.contactId &&
          Boolean(guest.name?.trim()) &&
          Boolean(guest.email?.trim())
      ),
    [guestRows]
  );
  const sendEligibility = useMemo(() => {
    const draftContent = draftEditorContent.trim();
    if (!campaignKit?.inviteAsset?.src) {
      return {
        canSend: false,
        reason: 'Save an invite image to this event from AI Studio before sending.',
      };
    }
    if (!draftContent) {
      return {
        canSend: false,
        reason: 'Save an email draft to this event from AI Studio before sending.',
      };
    }
    return { canSend: true, reason: '' };
  }, [campaignKit?.inviteAsset?.src, draftEditorContent]);

  async function createContact(
    payload: Omit<ContactRecord, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
  ) {
    if (!user) throw new Error('You must be signed in.');
    const idToken = await user.getIdToken();
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to create contact');
    }
    const created = data.contact as ContactRecord;
    setContacts((current) => [created, ...current]);
    return created;
  }

  async function importExistingGuestsToGuestBook() {
    if (!importableGuests.length) return [];
    setImportingExistingGuests(true);
    setError('');
    try {
      const importedContacts: ContactRecord[] = [];
      for (const guest of importableGuests) {
        const created = await createContact({
          name: guest.name,
          email: guest.email,
          phone: guest.phone || '',
          category: guest.category || guest.guestType || 'friends',
          notes: guest.notes || '',
          defaultGuestCount: guest.maxGuests || 1,
        });
        importedContacts.push(created);
      }
      return importedContacts;
    } finally {
      setImportingExistingGuests(false);
    }
  }

  async function handleSaveDraft() {
    if (!user || !params?.eventId) return;
    setSavingDraft(true);
    setDraftNotice('');
    setError('');
    try {
      const idToken = await user.getIdToken();
      const cleanedDraft = sanitizeEmailDraft(draftEditorContent);
      const result = await saveCampaignKitPatch(params.eventId, idToken, {
        emailDraft: {
          content: cleanedDraft,
          updatedAt: new Date().toISOString(),
          sourceConversationId: campaignKit?.emailDraft?.sourceConversationId ?? null,
          sourceMessageId: campaignKit?.emailDraft?.sourceMessageId ?? null,
        },
      });
      setCampaignKit(result.campaignKit);
      setDraftEditorContent(cleanedDraft);
      setDraftNotice('Draft saved to this event.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleConfirmRecipients(contactIds: string[]) {
    if (!user || !params?.eventId) return;
    setSendingInvites(true);
    setSendNotice('');
    setDraftNotice('');
    setError('');
    try {
      const idToken = await user.getIdToken();
      const cleanedDraft = sanitizeEmailDraft(draftEditorContent);
      if (campaignKit?.emailDraft?.content !== cleanedDraft) {
        const saveResult = await saveCampaignKitPatch(params.eventId, idToken, {
          emailDraft: {
            content: cleanedDraft,
            updatedAt: new Date().toISOString(),
            sourceConversationId: campaignKit?.emailDraft?.sourceConversationId ?? null,
            sourceMessageId: campaignKit?.emailDraft?.sourceMessageId ?? null,
          },
        });
        setCampaignKit(saveResult.campaignKit);
      }

      const assignRes = await fetch(`/api/events/${params.eventId}/guests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds }),
      });
      const assignData = await assignRes.json();
      if (!assignRes.ok) {
        throw new Error(assignData?.error || 'Failed to assign recipients');
      }

      const assignedGuests = Array.isArray(assignData?.guests) ? (assignData.guests as GuestRecord[]) : [];
      setGuests((current) => {
        const byId = new Map(current.map((guest) => [guest.id, guest]));
        for (const guest of assignedGuests) {
          byId.set(guest.id, guest);
        }
        return Array.from(byId.values()).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      });

      const sendRes = await fetch(`/api/events/${params.eventId}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: sendSubject,
          message: cleanedDraft,
          guestIds: assignedGuests.map((guest) => guest.id),
        }),
      });
      const sendData = await sendRes.json();
      if (!sendRes.ok) {
        throw new Error(sendData?.error || 'Failed to send invites');
      }

      if (sendData?.event) {
        setEvent(sendData.event as EventRecord);
      }
      setGuests((current) =>
        current.map((guest) => {
          const sentResult = (sendData?.results || []).find((result: { guestId?: string; status?: string }) => result.guestId === guest.id);
          if (sentResult?.status !== 'sent') return guest;
          return {
            ...guest,
            inviteStatus: 'sent',
            inviteSentAt: new Date().toISOString(),
          };
        })
      );
      setSendNotice(`Sent ${sendData?.sentCount || 0} invite emails.`);
      setShowRecipientModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invites');
    } finally {
      setSendingInvites(false);
    }
  }

  async function handleDeleteEvent() {
    if (!user || !params?.eventId || !event) return;
    const confirmed = window.confirm(`Delete "${event.title}"? This will also remove its recipients and RSVP responses.`);
    if (!confirmed) return;

    setDeletingEvent(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/events/${params.eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete event');
      }
      router.push('/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
      setDeletingEvent(false);
    }
  }

  return (
    <>
      <main className="min-h-screen">
        <Header />
        <PageBackButton fallbackHref="/events" />
        <section className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap gap-3">
                  <Link
                    href="/"
                    className="inline-flex rounded-full border border-[#ddcfbe] bg-white px-4 py-2 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4]"
                  >
                    Home
                  </Link>
                  <Link
                    href="/events"
                    className="inline-flex rounded-full border border-[#ddcfbe] bg-[#fff8ef] px-4 py-2 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4]"
                  >
                    Back to events
                  </Link>
                </div>
                <h1 className="mt-2 text-4xl font-semibold text-[#2d1810]">
                  {event?.title || 'Event details'}
                </h1>
                <div className="mt-4 flex flex-wrap gap-3">
                  <span className="rounded-full bg-[#f7efe4] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">
                    {responseStats.total} recipients
                  </span>
                  <span className="rounded-full bg-[#fff5e8] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">
                    {responseStats.pending} pending
                  </span>
                  <span className="rounded-full bg-[#eef5eb] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5d7c42]">
                    {responseStats.responded} responded
                  </span>
                  <span className="rounded-full bg-[#f3ece7] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">
                    {responseStats.sent} sent
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/guests"
                  className="rounded-full border border-[#ddcfbe] px-5 py-3 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4]"
                >
                  Open guest book
                </Link>
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={deletingEvent}
                  className="rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  {deletingEvent ? 'Deleting...' : 'Delete event'}
                </button>
                {event?.finalInviteUrl && (
                  <Link
                    href={event.finalInviteUrl}
                    target="_blank"
                    className="rounded-full bg-[#2d1810] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
                  >
                    Open invite art
                  </Link>
                )}
              </div>
            </div>

            {loadingPage ? (
              <div className="rounded-[28px] border border-[#e6ddd2] bg-white/90 px-6 py-10 text-center text-sm text-[#6b5b4f]">
                Loading event...
              </div>
            ) : error && !event ? (
              <div className="rounded-[28px] bg-red-50 px-6 py-6 text-sm text-red-700">{error}</div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-4">
                  <div className="rounded-[26px] border border-[#e6ddd2] bg-white/90 p-5 shadow-[0_16px_50px_rgba(45,24,16,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a56]">Host</p>
                    <p className="mt-3 text-lg font-semibold text-[#2d1810]">{event?.hostName || 'Not set'}</p>
                  </div>
                  <div className="rounded-[26px] border border-[#e6ddd2] bg-white/90 p-5 shadow-[0_16px_50px_rgba(45,24,16,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a56]">Event date</p>
                    <p className="mt-3 text-sm font-semibold text-[#2d1810]">
                      {event?.eventDate ? new Date(event.eventDate).toLocaleString() : 'Not set'}
                    </p>
                  </div>
                  <div className="rounded-[26px] border border-[#e6ddd2] bg-white/90 p-5 shadow-[0_16px_50px_rgba(45,24,16,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a56]">Venue</p>
                    <p className="mt-3 text-sm font-semibold text-[#2d1810]">{event?.venue || 'Not set'}</p>
                  </div>
                  <div className="rounded-[26px] border border-[#e6ddd2] bg-white/90 p-5 shadow-[0_16px_50px_rgba(45,24,16,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a56]">RSVP deadline</p>
                    <p className="mt-3 text-sm font-semibold text-[#2d1810]">
                      {event?.rsvpDeadline ? new Date(event.rsvpDeadline).toLocaleString() : 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="rounded-[30px] border border-[#e6ddd2] bg-[#fff9f1]/95 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Event story</p>
                  <p className="mt-3 text-sm leading-7 text-[#6b5b4f]">
                    {event?.description || 'Add a fuller event description here later if you want internal notes for your team.'}
                  </p>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="order-2 rounded-[30px] border border-[#e6ddd2] bg-[#fff9f1]/95 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.08)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Recipients</p>
                        <h2 className="mt-3 text-3xl font-semibold text-[#2d1810]">Choose from your guest book when you send</h2>
                        <p className="mt-3 text-sm leading-7 text-[#6b5b4f]">
                          Contacts now live at the account level. This event only keeps the people already assigned to it for sending and RSVP tracking.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRecipientModal(true)}
                        disabled={!sendEligibility.canSend}
                        title={sendEligibility.canSend ? 'Choose contacts to send invites' : sendEligibility.reason}
                        className="rounded-full bg-[#2d1810] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Send invite emails
                      </button>
                    </div>

                    {!sendEligibility.canSend && (
                      <p className="mt-4 rounded-2xl bg-[#fff4ea] px-4 py-3 text-sm text-[#8a6d54]">
                        {sendEligibility.reason}
                      </p>
                    )}
                    {sendNotice && (
                      <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {sendNotice}
                      </p>
                    )}
                    {error && (
                      <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </p>
                    )}

                    <div className="mt-6 rounded-[24px] border border-[#eadfd2] bg-white/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#4f3422]">Assigned recipients</p>
                        <span className="rounded-full bg-[#f7efe4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#855d3b]">
                          {guestRows.length} assigned
                        </span>
                      </div>
                      {guestRows.length === 0 ? (
                        <p className="mt-4 text-sm leading-6 text-[#6b5b4f]">
                          No recipients have been assigned to this event yet. Click Send invite emails to choose contacts from your guest book.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <div className="hidden items-center gap-4 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7a56] lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)_120px_100px_120px_auto]">
                            <span>Name</span>
                            <span>Email</span>
                            <span>Category</span>
                            <span>Guests</span>
                            <span>Status</span>
                            <span className="text-right">Action</span>
                          </div>
                          {guestRows.map((guest) => (
                            <div
                              key={guest.id}
                              className="grid gap-3 rounded-[20px] border border-[#efe3d5] bg-[#fffaf4] px-4 py-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)_120px_100px_120px_auto] lg:items-center"
                            >
                              <div className="min-w-0 lg:contents">
                                <p className="text-sm font-semibold text-[#2d1810]">{guest.name}</p>
                                <p className="mt-1 text-sm text-[#6b5b4f] lg:hidden">
                                  {guest.email || 'No email added'}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9a7a56] lg:hidden">
                                  max {guest.maxGuests || 1} {'·'} {formatInviteStatus(guest.inviteStatus)}
                                </p>
                              </div>
                              <p className="hidden truncate text-sm text-[#6b5b4f] lg:block">
                                {guest.email || 'No email added'}
                              </p>
                              <div className="hidden lg:flex lg:justify-center">
                                <span className="rounded-full bg-[#f5ecdf] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#855d3b]">
                                  {guest.category || guest.guestType || 'friends'}
                                </span>
                              </div>
                              <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56] lg:block lg:text-center">
                                {guest.maxGuests || 1}
                              </p>
                              <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56] lg:block lg:text-center">
                                {formatInviteStatus(guest.inviteStatus)}
                              </p>
                              <div className="flex flex-wrap gap-2 lg:justify-end">
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(buildPublicRsvpUrl(guest.rsvpToken))}
                                  className="rounded-full border border-[#ddcfbe] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4330] transition hover:bg-white"
                                >
                                  Copy RSVP link
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="order-1 rounded-[30px] border border-[#e6ddd2] bg-white/90 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.06)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Campaign kit</p>
                        <h3 className="mt-3 text-2xl font-semibold text-[#2d1810]">Saved invite + email</h3>
                      </div>
                      <Link
                        href={`/chat?eventId=${params.eventId}`}
                        className="rounded-full bg-[#2d1810] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
                      >
                        Open AI Studio for this event
                      </Link>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                      <div className="rounded-[24px] border border-[#eadfd2] bg-[#fffaf4] p-4">
                        <p className="text-sm font-semibold text-[#4f3422]">Invite image</p>
                        <div className="mt-4 space-y-4">
                          <div
                            className="aspect-[4/5] w-full rounded-[20px] border border-[#eadfd2] bg-cover bg-center"
                            style={{
                              backgroundImage: `url("${campaignKit?.inviteAsset?.src || event?.finalInviteUrl || '/wedding.svg'}")`,
                            }}
                          />
                          <p className="text-sm leading-6 text-[#6b5b4f]">
                            This is the visual asset that will travel with your email draft when you send from this event.
                          </p>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {campaignKit?.inviteAsset?.src && (
                            <a
                              href={campaignKit.inviteAsset.src}
                              download={`event-invite-${event?.id || 'draft'}.png`}
                              className="rounded-full border border-[#ddcfbe] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4330] transition hover:bg-white"
                            >
                              Download saved invite
                            </a>
                          )}
                          <span className="rounded-full bg-[#f5ecdf] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#855d3b]">
                            {campaignKit?.inviteAsset?.variant === 'final' ? 'Final invite saved' : 'Template or fallback'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[24px] border border-[#eadfd2] bg-[#fffaf4] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#4f3422]">Email draft</p>
                            {campaignKit?.emailDraft?.updatedAt && (
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56]">
                                {new Date(campaignKit.emailDraft.updatedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {campaignKit?.emailDraft?.content ? (
                            <p className="mt-4 text-sm leading-6 text-[#6b5b4f]">
                              This draft came from AI Studio. You can refine it here before saving or sending.
                            </p>
                          ) : (
                            <p className="mt-4 text-sm leading-6 text-[#6b5b4f]">
                              No email copy saved yet. Ask the AI to draft an invitation email, then save it to this event from the chat.
                            </p>
                          )}
                          <label className="mt-4 block text-sm font-medium text-[#4f3422]">
                            Edit email body
                            <textarea
                              value={draftEditorContent}
                              onChange={(e) => setDraftEditorContent(e.target.value)}
                              rows={12}
                              className="mt-2 w-full rounded-[20px] border border-[#ddd1c2] bg-white px-4 py-4 text-sm leading-7 text-[#5b4635] outline-none focus:border-[#d2b48c]"
                              placeholder="Write or refine the email body that should be sent with this invite."
                            />
                          </label>
                          {draftNotice && (
                            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                              {draftNotice}
                            </p>
                          )}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={handleSaveDraft}
                              disabled={savingDraft || !draftEditorContent.trim()}
                              className="rounded-full bg-[#2d1810] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#4a2e1d] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingDraft ? 'Saving...' : 'Save draft'}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(draftEditorContent)}
                              disabled={!draftEditorContent.trim()}
                              className="rounded-full border border-[#ddcfbe] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4330] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Copy draft
                            </button>
                            <span className="rounded-full bg-[#f5ecdf] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#855d3b]">
                              Emails only send after you confirm recipients
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                          <div className="rounded-[24px] border border-[#eadfd2] bg-[#fffaf4] p-4">
                          <p className="text-sm font-semibold text-[#4f3422]">Linked AI chats</p>
                          {campaignKit?.linkedChats?.length ? (
                            <div className="mt-4 space-y-3">
                              {campaignKit.linkedChats.map((chat) => (
                                <div key={chat.conversationId} className="rounded-[18px] bg-white px-4 py-3">
                                  <p className="text-sm font-semibold text-[#2d1810]">{chat.title}</p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9a7a56]">
                                    Updated {new Date(chat.updatedAt).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-4 text-sm leading-6 text-[#6b5b4f]">
                              No chats linked yet. When you save an invite or email draft from the AI studio, that conversation will appear here.
                            </p>
                          )}
                          </div>

                          <div className="rounded-[24px] border border-[#eadfd2] bg-[#fffaf4] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#4f3422]">Send setup</p>
                            {event?.lastInviteSendAt && (
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56]">
                                Last send {new Date(event.lastInviteSendAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[#6b5b4f]">
                            Clicking Send invite emails opens your contact book so you can choose exactly which saved contacts should receive this event.
                          </p>
                          <label className="mt-4 block text-sm font-medium text-[#4f3422]">
                            Email subject
                            <input
                              value={sendSubject}
                              onChange={(e) => setSendSubject(e.target.value)}
                              className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                              placeholder={`You're invited to ${event?.title || 'our event'}`}
                            />
                          </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-[#e6ddd2] bg-white/90 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.06)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">RSVP Responses</p>
                        <h3 className="mt-3 text-2xl font-semibold text-[#2d1810]">Response overview</h3>
                      </div>
                      <Link
                        href={`/events/${params.eventId}/responses`}
                        className="rounded-full bg-[#2d1810] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
                      >
                        Open responses dashboard
                      </Link>
                    </div>

                    <div className="mt-6 space-y-3">
                      {guestRows.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-[#dbcdbf] px-5 py-10 text-center text-sm text-[#6b5b4f]">
                          No recipients yet. Choose contacts from your guest book to start collecting RSVPs.
                        </div>
                      ) : (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-[22px] bg-[#f7efe4] px-4 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6d54]">Responses</p>
                              <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{responseSnapshot.totalResponses}</p>
                              <p className="mt-1 text-xs text-[#6b5b4f]">Across {guestRows.length} recipients</p>
                            </div>
                            <div className="rounded-[22px] bg-[#eef5eb] px-4 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7e51]">Attending</p>
                              <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{responseSnapshot.attending}</p>
                              <p className="mt-1 text-xs text-[#6b5b4f]">Confirmed households</p>
                            </div>
                            <div className="rounded-[22px] bg-[#fff5e8] px-4 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6d54]">Maybe</p>
                              <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{responseSnapshot.maybe}</p>
                              <p className="mt-1 text-xs text-[#6b5b4f]">Needs follow-up</p>
                            </div>
                            <div className="rounded-[22px] bg-[#f3ece7] px-4 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6d54]">Not attending</p>
                              <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{responseSnapshot.notAttending}</p>
                              <p className="mt-1 text-xs text-[#6b5b4f]">Declined invites</p>
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-dashed border-[#dbcdbf] bg-[#fffaf4] px-5 py-5 text-sm text-[#6b5b4f]">
                            Review full guest-by-guest responses, meal counts, and notes on the dedicated responses page.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        <Footer />
      </main>

      {showRecipientModal && event && (
        <RecipientPickerModal
          contacts={contacts}
          existingRecipients={guestRows.map((guest) => ({
            id: guest.id,
            name: guest.name,
            email: guest.email,
            category: guest.category || guest.guestType,
          }))}
          initiallySelectedContactIds={selectedContactIds}
          eventTitle={event.title}
          busy={sendingInvites}
          onClose={() => setShowRecipientModal(false)}
          onCreateContact={createContact}
          onImportExistingGuests={importableGuests.length ? importExistingGuestsToGuestBook : undefined}
          importableGuestCount={importableGuests.length}
          onConfirm={handleConfirmRecipients}
        />
      )}
    </>
  );
}
