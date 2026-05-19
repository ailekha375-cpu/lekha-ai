'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Footer from '../../components/Footer';
import Header from '../../components/Header';
import PageBackButton from '../../components/PageBackButton';
import { useAuth } from '../../lib/useAuth';
import { loadCampaignKit } from '../../lib/eventCampaignApi';
import type { EventCampaignKit, EventRecord, GuestRecord, RsvpResponseRecord } from '../../lib/eventTypes';
import { getEventWorkspace } from '../../lib/eventWorkspace';

type GuestFormState = {
  name: string;
  email: string;
  phone: string;
  maxGuests: string;
  guestType: string;
};

const INITIAL_GUEST_FORM: GuestFormState = {
  name: '',
  email: '',
  phone: '',
  maxGuests: '1',
  guestType: 'single',
};

function formatInviteStatus(status?: string | null) {
  return status ? status.replace(/_/g, ' ') : 'pending';
}

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [guestForm, setGuestForm] = useState<GuestFormState>(INITIAL_GUEST_FORM);
  const [error, setError] = useState('');
  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [campaignKit, setCampaignKit] = useState<EventCampaignKit | null>(null);
  const [responses, setResponses] = useState<RsvpResponseRecord[]>([]);
  const [sendSubject, setSendSubject] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sendNotice, setSendNotice] = useState('');
  const [deletingEvent, setDeletingEvent] = useState(false);

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
        const [eventRes, guestsRes, responsesRes, campaignKitData] = await Promise.all([
          fetch(`/api/events/${params.eventId}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          fetch(`/api/events/${params.eventId}/guests`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          fetch(`/api/events/${params.eventId}/responses`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          loadCampaignKit(params.eventId, idToken),
        ]);

        const eventData = await eventRes.json();
        const guestsData = await guestsRes.json();
        const responsesData = await responsesRes.json();

        if (!eventRes.ok) throw new Error(eventData?.error || 'Failed to load event');
        if (!guestsRes.ok) throw new Error(guestsData?.error || 'Failed to load guests');

        setEvent(eventData.event);
        setGuests(Array.isArray(guestsData?.guests) ? guestsData.guests : []);
        if (responsesRes.ok) {
          setResponses(Array.isArray(responsesData?.responses) ? responsesData.responses : []);
        } else {
          console.warn('Responses endpoint unavailable:', responsesData?.error || responsesRes.status);
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
        setSendSubject(
          eventData?.event?.lastInviteSubject ||
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
  const sendEligibility = useMemo(() => {
    const guestsWithEmail = guestRows.filter((guest) => Boolean(guest.email?.trim()));
    if (!campaignKit?.inviteAsset?.src) {
      return {
        canSend: false,
        reason: 'Save an invite image to this event from AI Studio before sending.',
        queuedCount: guestsWithEmail.length,
      };
    }
    if (!campaignKit?.emailDraft?.content?.trim()) {
      return {
        canSend: false,
        reason: 'Save an email draft to this event from AI Studio before sending.',
        queuedCount: guestsWithEmail.length,
      };
    }
    if (guestRows.length === 0) {
      return {
        canSend: false,
        reason: 'Add at least one guest before sending invites.',
        queuedCount: 0,
      };
    }
    if (guestsWithEmail.length === 0) {
      return {
        canSend: false,
        reason: 'Add an email address to at least one guest before sending invites.',
        queuedCount: 0,
      };
    }
    return {
      canSend: true,
      reason: '',
      queuedCount: guestsWithEmail.length,
    };
  }, [campaignKit?.emailDraft?.content, campaignKit?.inviteAsset?.src, guestRows]);

  async function handleAddGuest(eventForm: React.FormEvent) {
    eventForm.preventDefault();
    if (!user || !params?.eventId) return;
    setSubmitting(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/events/${params.eventId}/guests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guests: [
            {
              name: guestForm.name.trim(),
              email: guestForm.email.trim(),
              phone: guestForm.phone.trim(),
              maxGuests: Number(guestForm.maxGuests),
              guestType: guestForm.guestType,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to add guest');
      }
      setGuests((current) => [...current, ...(data?.guests || [])]);
      setGuestForm(INITIAL_GUEST_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add guest');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendInvites() {
    if (!user || !params?.eventId) return;
    setSendingInvites(true);
    setSendNotice('');
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/events/${params.eventId}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject: sendSubject }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send invites');
      }
      if (data?.event) {
        setEvent(data.event as EventRecord);
      }
      setGuests((current) =>
        current.map((guest) => {
          const sentResult = (data?.results || []).find((result: { guestId?: string; status?: string }) => result.guestId === guest.id);
          if (sentResult?.status !== 'sent') return guest;
          return {
            ...guest,
            inviteStatus: 'sent',
            inviteSentAt: new Date().toISOString(),
          };
        })
      );
      setSendNotice(`Sent ${data?.sentCount || 0} invite emails.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invites');
    } finally {
      setSendingInvites(false);
    }
  }

  async function handleDeleteEvent() {
    if (!user || !params?.eventId || !event) return;
    const confirmed = window.confirm(`Delete "${event.title}"? This will also remove its guests and RSVP responses.`);
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
        if (res.status === 404) {
          router.push('/events');
          return;
        }
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
                    {responseStats.total} guests
                  </span>
                  <span className="rounded-full bg-[#fff5e8] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">
                    {responseStats.pending} pending
                  </span>
                  <span className="rounded-full bg-[#eef5eb] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5d7c42]">
                    {responseStats.responded} responded
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/events"
                  className="rounded-full border border-[#ddcfbe] px-5 py-3 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4]"
                >
                  Create another event
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
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Event Story</p>
                  <p className="mt-3 text-sm leading-7 text-[#6b5b4f]">
                    {event?.description || 'Add a fuller event description here later if you want internal notes for your team.'}
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[30px] border border-[#e6ddd2] bg-[#fff9f1]/95 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Guest List</p>
                    <h2 className="mt-3 text-3xl font-semibold text-[#2d1810]">Invite people and share RSVP links</h2>
                    <p className="mt-3 text-sm leading-7 text-[#6b5b4f]">
                      Each guest gets their own RSVP token. Add people here now, then connect email delivery in the next backend pass.
                    </p>

                    <form onSubmit={handleAddGuest} className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-[#4f3422]">
                        Name
                        <input
                          value={guestForm.name}
                          onChange={(e) => setGuestForm((current) => ({ ...current, name: e.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                          required
                        />
                      </label>
                      <label className="text-sm font-medium text-[#4f3422]">
                        Email
                        <input
                          type="email"
                          value={guestForm.email}
                          onChange={(e) => setGuestForm((current) => ({ ...current, email: e.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                          required
                        />
                      </label>
                      <label className="text-sm font-medium text-[#4f3422]">
                        Phone
                        <input
                          value={guestForm.phone}
                          onChange={(e) => setGuestForm((current) => ({ ...current, phone: e.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                        />
                      </label>
                      <label className="text-sm font-medium text-[#4f3422]">
                        Guest type
                        <select
                          value={guestForm.guestType}
                          onChange={(e) => setGuestForm((current) => ({ ...current, guestType: e.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                        >
                          <option value="single">Single</option>
                          <option value="couple">Couple</option>
                          <option value="family">Family</option>
                        </select>
                      </label>
                      <label className="text-sm font-medium text-[#4f3422] sm:col-span-2">
                        Max guests
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={guestForm.maxGuests}
                          onChange={(e) => setGuestForm((current) => ({ ...current, maxGuests: e.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                        />
                      </label>

                      {error && <p className="sm:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="rounded-full bg-[#2d1810] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d] disabled:opacity-60"
                        >
                          {submitting ? 'Adding...' : 'Add guest'}
                        </button>
                      </div>
                    </form>

                    <div className="mt-6 rounded-[24px] border border-[#eadfd2] bg-white/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#4f3422]">Guests added</p>
                        <span className="rounded-full bg-[#f7efe4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#855d3b]">
                          {guestRows.length} total
                        </span>
                      </div>
                      {guestRows.length === 0 ? (
                        <p className="mt-4 text-sm leading-6 text-[#6b5b4f]">
                          No guests added yet. Add your first guest above and they will appear here with their RSVP link status.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {guestRows.map((guest) => (
                            <div
                              key={guest.id}
                              className="flex flex-col gap-3 rounded-[20px] border border-[#efe3d5] bg-[#fffaf4] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#2d1810]">{guest.name}</p>
                                <p className="mt-1 truncate text-sm text-[#6b5b4f]">
                                  {guest.email || 'No email added'}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9a7a56]">
                                  {guest.guestType || 'guest'} · max {guest.maxGuests || 1} · {formatInviteStatus(guest.inviteStatus)}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={`/rsvp/${guest.rsvpToken}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full border border-[#ddcfbe] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4330] transition hover:bg-white"
                                >
                                  Open RSVP
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      `${window.location.origin}/rsvp/${guest.rsvpToken}`
                                    )
                                  }
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

                  <div className="rounded-[30px] border border-[#e6ddd2] bg-white/90 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.06)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Campaign Kit</p>
                        <h3 className="mt-3 text-2xl font-semibold text-[#2d1810]">Saved invite + email</h3>
                      </div>
                      <Link
                        href={`/chat?eventId=${params.eventId}`}
                        className="rounded-full bg-[#2d1810] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
                      >
                        Open AI Studio for this event
                      </Link>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                      <div className="rounded-[24px] border border-[#eadfd2] bg-[#fffaf4] p-4">
                        <p className="text-sm font-semibold text-[#4f3422]">Invite image</p>
                        <div className="mt-4 grid gap-4 lg:grid-cols-[120px_1fr]">
                          <div
                            className="aspect-[3/4] w-full rounded-[20px] border border-[#eadfd2] bg-cover bg-center"
                            style={{
                              backgroundImage: `url("${campaignKit?.inviteAsset?.src || event?.finalInviteUrl || '/wedding.svg'}")`,
                            }}
                          />
                          <div className="space-y-3 text-sm text-[#6b5b4f]">
                            <p>
                              This is the current invite art attached to the event. You can keep a raw template or a finished invite with text already applied.
                            </p>
                            <p>
                              Later, the send flow can use this image together with the saved email draft as the event&apos;s send-ready package.
                            </p>
                          </div>
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
                            <>
                              <p className="mt-4 whitespace-pre-line rounded-[20px] bg-white px-4 py-4 text-sm leading-7 text-[#5b4635]">
                                {campaignKit.emailDraft.content}
                              </p>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(campaignKit.emailDraft?.content || '')}
                                className="mt-4 rounded-full border border-[#ddcfbe] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4330] transition hover:bg-white"
                              >
                                Copy email draft
                              </button>
                            </>
                          ) : (
                            <p className="mt-4 text-sm leading-6 text-[#6b5b4f]">
                              No email copy saved yet. Ask the AI to draft an invitation email, then save it to this event from the chat.
                            </p>
                          )}
                        </div>

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
                            <p className="text-sm font-semibold text-[#4f3422]">Send invites</p>
                            {event?.lastInviteSendAt && (
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56]">
                                Last send {new Date(event.lastInviteSendAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[#6b5b4f]">
                            This sends the saved invite image and the saved email draft to every guest with an email address.
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
                          {sendNotice && (
                            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                              {sendNotice}
                            </p>
                          )}
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={handleSendInvites}
                              disabled={
                                sendingInvites ||
                                !sendEligibility.canSend
                              }
                              title={
                                sendingInvites
                                  ? 'Sending invites now'
                                  : sendEligibility.canSend
                                    ? 'Send invite emails'
                                    : sendEligibility.reason
                              }
                              className="rounded-full bg-[#2d1810] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {sendingInvites ? 'Sending...' : 'Send invite emails'}
                            </button>
                            <span className="text-xs uppercase tracking-[0.14em] text-[#8a6d54]">
                              {sendEligibility.queuedCount} guests queued
                            </span>
                          </div>
                          {!sendEligibility.canSend && (
                            <p className="mt-3 text-sm text-[#8a6d54]">{sendEligibility.reason}</p>
                          )}
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
                          No guests yet. Add the first guest above to generate a personal RSVP link.
                        </div>
                      ) : (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-[22px] bg-[#f7efe4] px-4 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6d54]">Responses</p>
                              <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{responseSnapshot.totalResponses}</p>
                              <p className="mt-1 text-xs text-[#6b5b4f]">Across {guestRows.length} guests</p>
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
    </>
  );
}
