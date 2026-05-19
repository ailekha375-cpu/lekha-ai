'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Footer from '../../../components/Footer';
import Header from '../../../components/Header';
import PageBackButton from '../../../components/PageBackButton';
import { useAuth } from '../../../lib/useAuth';
import type { EventRecord, GuestRecord, GuestResponseRecord, RsvpResponseRecord } from '../../../lib/eventTypes';

function formatInviteStatus(status?: string | null) {
  return status ? status.replace(/_/g, ' ') : 'pending';
}

function normalizeMealPreference(value?: string | null) {
  if (!value) return 'unspecified';
  const normalized = value.trim().toLowerCase();
  if (['veg', 'vegetarian', 'veggie'].includes(normalized)) return 'vegetarian';
  if (['nonveg', 'non-veg', 'non vegetarian', 'non-vegetarian', 'meat'].includes(normalized)) {
    return 'nonVegetarian';
  }
  return normalized;
}

export default function EventResponsesPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [responses, setResponses] = useState<RsvpResponseRecord[]>([]);
  const [error, setError] = useState('');
  const [loadingPage, setLoadingPage] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function loadResponsesPage() {
      if (!user || !params?.eventId) return;
      setLoadingPage(true);
      setError('');
      try {
        const idToken = await user.getIdToken();
        const [eventRes, guestsRes, responsesRes] = await Promise.all([
          fetch(`/api/events/${params.eventId}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          fetch(`/api/events/${params.eventId}/guests`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          fetch(`/api/events/${params.eventId}/responses`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
        ]);

        const eventData = await eventRes.json();
        const guestsData = await guestsRes.json();
        const responsesData = await responsesRes.json();

        if (!eventRes.ok) throw new Error(eventData?.error || 'Failed to load event');
        if (!guestsRes.ok) throw new Error(guestsData?.error || 'Failed to load guests');
        if (!responsesRes.ok) throw new Error(responsesData?.error || 'Failed to load responses');

        setEvent(eventData.event);
        setGuests(Array.isArray(guestsData?.guests) ? guestsData.guests : []);
        setResponses(Array.isArray(responsesData?.responses) ? responsesData.responses : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load responses');
      } finally {
        setLoadingPage(false);
      }
    }

    loadResponsesPage();
  }, [params?.eventId, user]);

  const guestRows = useMemo(
    () => [...guests].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
    [guests]
  );
  const guestRowsWithResponses = useMemo<GuestResponseRecord[]>(
    () =>
      guestRows.map((guest) => ({
        ...guest,
        response: responses.find((response) => response.guestId === guest.id) ?? null,
      })),
    [guestRows, responses]
  );

  const attendanceSummary = useMemo(() => {
    return responses.reduce(
      (summary, response) => {
        if (response.attendanceStatus === 'attending') {
          summary.attending += 1;
          summary.confirmedSeats += Number(response.guestCount || 0);
        } else if (response.attendanceStatus === 'not_attending') {
          summary.notAttending += 1;
        } else if (response.attendanceStatus === 'maybe') {
          summary.maybe += 1;
        }

        const mealPreference = normalizeMealPreference(response.mealPreference);
        if (mealPreference === 'vegetarian') {
          summary.vegetarian += Number(response.guestCount || 0);
        } else if (mealPreference === 'nonVegetarian') {
          summary.nonVegetarian += Number(response.guestCount || 0);
        } else {
          summary.unspecifiedMeals += Number(response.guestCount || 0);
        }

        return summary;
      },
      {
        attending: 0,
        notAttending: 0,
        maybe: 0,
        confirmedSeats: 0,
        vegetarian: 0,
        nonVegetarian: 0,
        unspecifiedMeals: 0,
      }
    );
  }, [responses]);
  const responseRate = guestRows.length > 0 ? Math.round((responses.length / guestRows.length) * 100) : 0;

  return (
    <main className="min-h-screen">
      <Header />
      <PageBackButton fallbackHref="/responses" preferHistory={false} />
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
                  href={`/events/${params.eventId}`}
                  className="inline-flex rounded-full border border-[#ddcfbe] bg-[#fff8ef] px-4 py-2 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4]"
                >
                  Back to event
                </Link>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">RSVP dashboard</p>
              <h1 className="mt-3 text-4xl font-semibold text-[#2d1810]">
                {event?.title || 'Guest responses'}
              </h1>
              <p className="mt-3 text-sm leading-7 text-[#6b5b4f]">
                Review attendance, meal counts, and notes from every RSVP in one place.
              </p>
            </div>
          </div>

          {loadingPage ? (
            <div className="rounded-[28px] border border-[#e6ddd2] bg-white/90 px-6 py-10 text-center text-sm text-[#6b5b4f]">
              Loading responses...
            </div>
          ) : error ? (
            <div className="rounded-[28px] bg-red-50 px-6 py-6 text-sm text-red-700">{error}</div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-[22px] bg-[#f3ece7] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6d54]">Response rate</p>
                  <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{responseRate}%</p>
                  <p className="mt-1 text-xs text-[#6b5b4f]">{responses.length} of {guestRows.length} replied</p>
                </div>
                <div className="rounded-[22px] bg-[#f7efe4] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6d54]">Attending</p>
                  <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{attendanceSummary.attending}</p>
                  <p className="mt-1 text-xs text-[#6b5b4f]">{attendanceSummary.confirmedSeats} confirmed seats</p>
                </div>
                <div className="rounded-[22px] bg-[#fff5e8] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6d54]">Maybe</p>
                  <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{attendanceSummary.maybe}</p>
                  <p className="mt-1 text-xs text-[#6b5b4f]">Awaiting final confirmation</p>
                </div>
                <div className="rounded-[22px] bg-[#f3ece7] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6d54]">Not attending</p>
                  <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{attendanceSummary.notAttending}</p>
                  <p className="mt-1 text-xs text-[#6b5b4f]">Declined invitations</p>
                </div>
                <div className="rounded-[22px] bg-[#eef5eb] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7e51]">Vegetarian</p>
                  <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{attendanceSummary.vegetarian}</p>
                  <p className="mt-1 text-xs text-[#6b5b4f]">Counted by confirmed seats</p>
                </div>
                <div className="rounded-[22px] bg-[#f1f0eb] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a756a]">Non-veg</p>
                  <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{attendanceSummary.nonVegetarian}</p>
                  <p className="mt-1 text-xs text-[#6b5b4f]">{attendanceSummary.unspecifiedMeals} unspecified</p>
                </div>
                <div className="rounded-[22px] bg-[#fff8ef] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6d54]">Pending</p>
                  <p className="mt-2 text-2xl font-semibold text-[#2d1810]">{guestRows.length - responses.length}</p>
                  <p className="mt-1 text-xs text-[#6b5b4f]">Guests still to reply</p>
                </div>
              </div>

              <div className="rounded-[30px] border border-[#e6ddd2] bg-white/90 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Guest responses</p>
                    <h2 className="mt-3 text-2xl font-semibold text-[#2d1810]">{guestRows.length} guests</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {guestRows.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-[#dbcdbf] px-5 py-10 text-center text-sm text-[#6b5b4f]">
                      No guests yet. Add guests from the event workspace first.
                    </div>
                  ) : (
                    guestRowsWithResponses.map((guest) => (
                      <div key={guest.id} className="rounded-[24px] border border-[#e6d8c9] bg-[#fffaf4] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-[#2d1810]">{guest.name}</p>
                            <p className="mt-1 text-sm text-[#6b5b4f]">{guest.email}</p>
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#9a7a56]">
                              {formatInviteStatus(guest.inviteStatus)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a56]">Public RSVP URL</p>
                            <Link
                              href={`/rsvp/${guest.rsvpToken}`}
                              target="_blank"
                              className="mt-2 inline-block break-all text-sm font-medium text-[#4b6cb7] hover:underline"
                            >
                              {`/rsvp/${guest.rsvpToken}`}
                            </Link>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/rsvp/${guest.rsvpToken}`)}
                              className="mt-3 inline-flex rounded-full border border-[#ddcfbe] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b5b4f] transition hover:bg-white"
                            >
                              Copy full link
                            </button>
                          </div>
                        </div>
                        {guest.response ? (
                          <div className="mt-4 grid gap-3 rounded-[20px] bg-white px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56]">Attendance</p>
                              <p className="mt-2 text-sm font-semibold text-[#2d1810]">
                                {formatInviteStatus(guest.response.attendanceStatus)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56]">Guest count</p>
                              <p className="mt-2 text-sm font-semibold text-[#2d1810]">{guest.response.guestCount}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56]">Meal</p>
                              <p className="mt-2 text-sm font-semibold text-[#2d1810]">{guest.response.mealPreference || 'Not shared'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56]">Updated</p>
                              <p className="mt-2 text-sm font-semibold text-[#2d1810]">
                                {guest.response.updatedAt ? new Date(guest.response.updatedAt).toLocaleString() : 'Just now'}
                              </p>
                            </div>
                            {guest.response.notes && (
                              <div className="sm:col-span-2 lg:col-span-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56]">Notes</p>
                                <p className="mt-2 text-sm leading-6 text-[#5b4635]">{guest.response.notes}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-[20px] bg-white px-4 py-4 text-sm text-[#6b5b4f]">
                            No RSVP submitted yet for this guest.
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
