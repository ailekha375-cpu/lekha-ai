'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Footer from '../components/Footer';
import Header from '../components/Header';
import PageBackButton from '../components/PageBackButton';
import { useAuth } from '../lib/useAuth';
import type { EventRecord } from '../lib/eventTypes';

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ResponsesHubPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState('');

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
          headers: { Authorization: `Bearer ${idToken}` },
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load events');
        setEvents(Array.isArray(data?.events) ? data.events : []);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Loading response dashboards timed out. Please try again.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load events');
        }
      } finally {
        clearTimeout(timeout);
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, [loading, user]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [events]
  );

  return (
    <main className="min-h-screen">
      <Header />
      <PageBackButton fallbackHref="/" preferHistory={false} />
      <section className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[30px] border border-[#e6ddd2] bg-white/90 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.08)]">
            <div className="mb-4 flex flex-wrap gap-3">
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
                Event Hub
              </Link>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Track RSVPs</p>
            <h1 className="mt-3 text-4xl font-semibold text-[#2d1810]">Response dashboards by event</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#6b5b4f]">
              Choose an event to review attendance totals, meal counts, notes, and every guest response in one dedicated view.
            </p>
          </div>

          {error ? (
            <div className="rounded-[28px] border border-[#eed6cf] bg-[#fff4f1] px-6 py-5 text-sm text-[#8c3b2e]">
              {error}
            </div>
          ) : null}

          <div className="rounded-[30px] border border-[#e6ddd2] bg-[#fff9f1]/95 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.08)]">
            {loadingEvents ? (
              <div className="rounded-3xl border border-dashed border-[#dbcdbf] bg-white/80 px-5 py-10 text-center text-sm text-[#6b5b4f]">
                Loading response dashboards...
              </div>
            ) : sortedEvents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#dbcdbf] bg-white/80 px-5 py-10 text-center text-sm text-[#6b5b4f]">
                No events yet. Create an event first, then come back here to track RSVP responses.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}/responses`}
                    className="block rounded-[26px] border border-[#e6d7c6] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
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
                            Open dashboard
                          </span>
                        </div>
                        <div className="mt-4 grid gap-2 text-sm text-[#6b5b4f]">
                          <p><span className="font-medium text-[#4f3422]">Date:</span> {formatDate(event.eventDate)}</p>
                          <p><span className="font-medium text-[#4f3422]">Venue:</span> {event.venue || 'Not set'}</p>
                          <p><span className="font-medium text-[#4f3422]">RSVP deadline:</span> {formatDate(event.rsvpDeadline)}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
