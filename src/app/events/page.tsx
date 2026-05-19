'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Header from '../components/Header';
import Footer from '../components/Footer';
import PageBackButton from '../components/PageBackButton';
import { useAuth } from '../lib/useAuth';
import type { EventRecord } from '../lib/eventTypes';

type EventFormState = {
  title: string;
  eventType: string;
  hostName: string;
  description: string;
  eventDate: string;
  venue: string;
  rsvpDeadline: string;
  finalInviteUrl: string;
};

const INITIAL_FORM: EventFormState = {
  title: '',
  eventType: 'wedding',
  hostName: '',
  description: '',
  eventDate: '',
  venue: '',
  rsvpDeadline: '',
  finalInviteUrl: '/wedding.svg',
};

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function EventsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [form, setForm] = useState<EventFormState>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      setLoadingEvents(false);
      router.push('/');
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLoadingEvents(false);
      return;
    }
    const currentUser = user;

    async function loadEvents() {
      setLoadingEvents(true);
      setError('');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch('/api/events', {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load events');
        }
        setEvents(Array.isArray(data?.events) ? data.events : []);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Loading events timed out. Please refresh or try again in a moment.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load events');
        }
      } finally {
        clearTimeout(timeout);
        setLoadingEvents(false);
      }
    }
    loadEvents();
  }, [loading, user, reloadKey]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [events]
  );
  const stats = useMemo(
    () => ({
      total: events.length,
      ready: events.filter((event) => event.status === 'ready').length,
      draft: events.filter((event) => (event.status || 'draft') === 'draft').length,
    }),
    [events]
  );

  async function handleCreateEvent(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const payload = {
        ...form,
        title: form.title.trim(),
        hostName: form.hostName.trim(),
        description: form.description.trim(),
        venue: form.venue.trim(),
        finalInviteUrl: form.finalInviteUrl.trim() || '/wedding.svg',
        status: 'draft',
      };
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create event');
      }
      const created = data?.event as EventRecord;
      setEvents((current) => [created, ...current]);
      setForm(INITIAL_FORM);
      router.push(`/events/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEvent(eventId: string, eventTitle: string, clickEvent: React.MouseEvent) {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    if (!user) return;
    const confirmed = window.confirm(`Delete "${eventTitle}"? This will also remove its guests and RSVP responses.`);
    if (!confirmed) return;

    setDeletingEventId(eventId);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setEvents((current) => current.filter((entry) => entry.id !== eventId));
          return;
        }
        throw new Error(data?.error || 'Failed to delete event');
      }
      setEvents((current) => current.filter((entry) => entry.id !== eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setDeletingEventId(null);
    }
  }

  return (
    <>
      <main className="min-h-screen">
        <Header />
        <PageBackButton fallbackHref="/" />
        <section className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[32px] border border-[#e6ddd2] bg-white/90 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.10)] backdrop-blur">
              <div className="mb-5 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex rounded-full border border-[#ddcfbe] bg-white px-4 py-2 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4]"
                >
                  Home
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex rounded-full border border-[#ddcfbe] bg-[#fff8ef] px-4 py-2 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4]"
                >
                  AI Studio
                </Link>
              </div>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">Event Studio</p>
                  <h1 className="mt-3 text-4xl font-semibold text-[#2d1810]">Create your RSVP-ready event</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6b5b4f]">
                    Save the final invite, attach event details, and create the record your guest links will run on.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 lg:min-w-[280px]">
                  <div className="rounded-[24px] bg-[#f7efe4] px-4 py-4 text-center">
                    <p className="text-2xl font-semibold text-[#2d1810]">{stats.total}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6d54]">Events</p>
                  </div>
                  <div className="rounded-[24px] bg-[#fff5e8] px-4 py-4 text-center">
                    <p className="text-2xl font-semibold text-[#2d1810]">{stats.draft}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6d54]">Drafts</p>
                  </div>
                  <div className="rounded-[24px] bg-[#f0f4eb] px-4 py-4 text-center">
                    <p className="text-2xl font-semibold text-[#2d1810]">{stats.ready}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6d54]">Ready</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/chat"
                  className="rounded-full bg-[#2d1810] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
                >
                  Start from AI template
                </Link>
                <p className="rounded-full border border-[#e4d8ca] bg-[#fcf6ef] px-4 py-3 text-sm text-[#6b5b4f]">
                  Placeholder image mode is active, so you can build the RSVP flow before reconnecting full generation.
                </p>
              </div>

              <form onSubmit={handleCreateEvent} className="mt-8 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#4f3422] sm:col-span-2">
                  Event title
                  <input
                    value={form.title}
                    onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                    placeholder="Aarav & Maya Wedding"
                    required
                  />
                </label>

                <label className="text-sm font-medium text-[#4f3422]">
                  Event type
                  <select
                    value={form.eventType}
                    onChange={(e) => setForm((current) => ({ ...current, eventType: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                  >
                    <option value="wedding">Wedding</option>
                    <option value="birthday">Birthday</option>
                    <option value="baby_shower">Baby shower</option>
                    <option value="corporate">Corporate</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-[#4f3422]">
                  Host name
                  <input
                    value={form.hostName}
                    onChange={(e) => setForm((current) => ({ ...current, hostName: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                    placeholder="Yash"
                  />
                </label>

                <label className="text-sm font-medium text-[#4f3422]">
                  Event date
                  <input
                    type="datetime-local"
                    value={form.eventDate}
                    onChange={(e) => setForm((current) => ({ ...current, eventDate: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                  />
                </label>

                <label className="text-sm font-medium text-[#4f3422]">
                  RSVP deadline
                  <input
                    type="datetime-local"
                    value={form.rsvpDeadline}
                    onChange={(e) => setForm((current) => ({ ...current, rsvpDeadline: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                  />
                </label>

                <label className="text-sm font-medium text-[#4f3422] sm:col-span-2">
                  Venue
                  <input
                    value={form.venue}
                    onChange={(e) => setForm((current) => ({ ...current, venue: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                    placeholder="The Garden Estate, Scottsdale"
                  />
                </label>

                <label className="text-sm font-medium text-[#4f3422] sm:col-span-2">
                  Description
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                    className="mt-2 min-h-28 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                    placeholder="Wedding ceremony and reception"
                  />
                </label>

                <label className="text-sm font-medium text-[#4f3422] sm:col-span-2">
                  Final invite image URL
                  <input
                    value={form.finalInviteUrl}
                    onChange={(e) => setForm((current) => ({ ...current, finalInviteUrl: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                    placeholder="/wedding.svg"
                  />
                </label>

                {error && <p className="sm:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

                <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-3xl bg-[linear-gradient(135deg,rgba(210,180,140,0.18),rgba(229,228,226,0.55))] px-5 py-4">
                  <p className="text-sm text-[#5b4635]">
                    Start with a placeholder invite now, then swap in the real edited image once your live generation flow is connected.
                  </p>
                  <button
                    type="submit"
                    disabled={submitting || !user}
                    className="shrink-0 rounded-full bg-[#2d1810] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d] disabled:opacity-60"
                  >
                    {submitting ? 'Creating...' : 'Create event'}
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-[32px] border border-[#e6ddd2] bg-[#fff9f1]/95 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">Host Dashboard</p>
                  <h2 className="mt-3 text-3xl font-semibold text-[#2d1810]">Your events</h2>
                </div>
                <Link
                  href="/chat"
                  className="rounded-full border border-[#ddcfbe] px-4 py-2 text-sm font-medium text-[#6b5b4f] transition hover:bg-white"
                >
                  Back to AI
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {error && !loadingEvents ? (
                  <div className="rounded-3xl border border-[#eed6cf] bg-[#fff4f1] px-5 py-4 text-sm text-[#8c3b2e]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>{error}</span>
                      <button
                        type="button"
                        onClick={() => setReloadKey((current) => current + 1)}
                        className="inline-flex rounded-full border border-[#d8b6ae] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8c3b2e] transition hover:bg-[#fff8f6]"
                      >
                        Retry load
                      </button>
                    </div>
                  </div>
                ) : null}
                {loadingEvents ? (
                  <div className="rounded-3xl border border-dashed border-[#dbcdbf] bg-white/80 px-5 py-10 text-center text-sm text-[#6b5b4f]">
                    Loading events...
                  </div>
                ) : sortedEvents.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#dbcdbf] bg-white/80 px-5 py-10 text-center text-sm text-[#6b5b4f]">
                    No events yet. Create your first RSVP-ready event on the left.
                  </div>
                ) : (
                  sortedEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="block rounded-[28px] border border-[#e6d7c6] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex gap-4">
                        <div
                          className="h-28 w-24 shrink-0 rounded-[20px] border border-[#eadfd2] bg-cover bg-center"
                          style={{ backgroundImage: `url("${event.finalInviteUrl || '/wedding.svg'}")` }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-semibold text-[#2d1810]">{event.title}</p>
                              <p className="mt-1 text-sm capitalize text-[#8a6d54]">{event.eventType || 'event'}</p>
                            </div>
                            <span className="rounded-full bg-[#f3e6d5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">
                              {event.status || 'draft'}
                            </span>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-[#6b5b4f]">
                            <p><span className="font-medium text-[#4f3422]">Date:</span> {formatDate(event.eventDate)}</p>
                            <p><span className="font-medium text-[#4f3422]">Venue:</span> {event.venue || 'Not set'}</p>
                            <p><span className="font-medium text-[#4f3422]">RSVP deadline:</span> {formatDate(event.rsvpDeadline)}</p>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="inline-flex rounded-full bg-[#f7efe4] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">
                              Manage guests and RSVP links
                            </div>
                            <button
                              type="button"
                              onClick={(clickEvent) => handleDeleteEvent(event.id, event.title, clickEvent)}
                              disabled={deletingEventId === event.id}
                              aria-label={`Delete ${event.title}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                              {deletingEventId === event.id ? (
                                <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">...</span>
                              ) : (
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}
