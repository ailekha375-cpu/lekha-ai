'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import Footer from '../../components/Footer';
import Header from '../../components/Header';
import PageBackButton from '../../components/PageBackButton';
import { apiRequest } from '../../lib/apiClient';
import { getErrorMessage } from '../../lib/errors';
import type { EventRecord, GuestRecord, RsvpResponseRecord } from '../../lib/eventTypes';
import { validateRsvpInput } from '../../lib/validators';

type RsvpPayload = {
  attendanceStatus: 'attending' | 'not_attending' | 'maybe';
  guestCount: string;
  mealPreference: string;
  notes: string;
  respondedBy: string;
};

export default function RsvpPage() {
  const params = useParams<{ token: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [guest, setGuest] = useState<GuestRecord | null>(null);
  const [existingResponse, setExistingResponse] = useState<RsvpResponseRecord | null>(null);
  const [form, setForm] = useState<RsvpPayload>({
    attendanceStatus: 'attending',
    guestCount: '1',
    mealPreference: '',
    notes: '',
    respondedBy: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadRsvp() {
      if (!params?.token) return;
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest<{
          event?: EventRecord | null;
          guest?: GuestRecord | null;
          response?: RsvpResponseRecord | null;
        }>(`/api/rsvp/${params.token}`);
        setEvent(data?.event || null);
        setGuest(data?.guest || null);
        setExistingResponse(data?.response || null);
        setForm({
          attendanceStatus: data?.response?.attendanceStatus || 'attending',
          guestCount: String(data?.response?.guestCount || data?.guest?.maxGuests || 1),
          mealPreference: data?.response?.mealPreference || '',
          notes: data?.response?.notes || '',
          respondedBy: data?.response?.respondedBy || data?.guest?.name || '',
        });
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load RSVP'));
      } finally {
        setLoading(false);
      }
    }
    loadRsvp();
  }, [params?.token]);

  async function handleSubmit(eventForm: React.FormEvent) {
    eventForm.preventDefault();
    if (!params?.token) return;
    const maxGuests = Math.max(1, Number(guest?.maxGuests || 1));
    const validation = validateRsvpInput({
      respondedBy: form.respondedBy,
      guestCount: form.guestCount,
      maxGuests,
    });
    if (!validation.ok) {
      setError(validation.message);
      setSuccess('');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiRequest<{ response?: RsvpResponseRecord | null }>(`/api/rsvp/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceStatus: form.attendanceStatus,
          guestCount: validation.value.guestCount,
          mealPreference: form.mealPreference.trim(),
          notes: form.notes.trim(),
          respondedBy: validation.value.respondedBy,
        }),
      });
      setExistingResponse(data?.response || null);
      setSuccess('Your RSVP has been recorded.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit RSVP'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="min-h-screen">
        <Header />
        <PageBackButton fallbackHref="/" />
        <section className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[30px] border border-[#e6ddd2] bg-white/90 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.08)]">
              <div className="mb-4 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex rounded-full border border-[#ddcfbe] bg-white px-4 py-2 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4]"
                >
                  Home
                </Link>
              </div>
              <div
                className="aspect-[3/4] w-full rounded-[26px] border border-[#eadfd2] bg-cover bg-center"
                style={{ backgroundImage: `url("${event?.finalInviteUrl || '/wedding.svg'}")` }}
              />
              <div className="mt-6 space-y-3 text-sm text-[#6b5b4f]">
                <p className="text-2xl font-semibold text-[#2d1810]">{event?.title || 'Invitation'}</p>
                <p><span className="font-semibold text-[#4f3422]">Venue:</span> {event?.venue || 'To be announced'}</p>
                <p><span className="font-semibold text-[#4f3422]">Date:</span> {event?.eventDate ? new Date(event.eventDate).toLocaleString() : 'To be announced'}</p>
                <p><span className="font-semibold text-[#4f3422]">RSVP deadline:</span> {event?.rsvpDeadline ? new Date(event.rsvpDeadline).toLocaleString() : 'Open'}</p>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#e6ddd2] bg-[#fff9f1]/95 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.08)]">
              {loading ? (
                <div className="rounded-3xl border border-dashed border-[#dbcdbf] px-5 py-10 text-center text-sm text-[#6b5b4f]">
                  Loading your invitation...
                </div>
              ) : error && !guest ? (
                <div className="rounded-3xl bg-red-50 px-5 py-6 text-sm text-red-700">{error}</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">RSVP Form</p>
                    {existingResponse && (
                      <span className="rounded-full bg-[#eef5eb] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5d7c42]">
                        Response saved
                      </span>
                    )}
                  </div>
                  <h1 className="mt-3 text-4xl font-semibold text-[#2d1810]">
                    {guest?.name ? `${guest.name}, will you be joining us?` : 'Please RSVP'}
                  </h1>
                  <p className="mt-4 text-sm leading-7 text-[#6b5b4f]">
                    Tell the host whether you can attend and how many seats you&apos;ll need. You can come back to this link and update it later.
                  </p>

                  <div className="mt-6 rounded-[24px] border border-[#e8dccf] bg-white/75 px-5 py-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a56]">Guest</p>
                        <p className="mt-2 text-sm font-semibold text-[#2d1810]">{guest?.name || 'Guest'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a56]">Seats allowed</p>
                        <p className="mt-2 text-sm font-semibold text-[#2d1810]">{guest?.maxGuests || 1}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a56]">Host</p>
                        <p className="mt-2 text-sm font-semibold text-[#2d1810]">{event?.hostName || 'Event host'}</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-[#4f3422] sm:col-span-2">
                      Your name
                      <input
                        value={form.respondedBy}
                        onChange={(e) => setForm((current) => ({ ...current, respondedBy: e.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                        required
                      />
                    </label>

                    <label className="text-sm font-medium text-[#4f3422]">
                      Attendance
                      <select
                        value={form.attendanceStatus}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            attendanceStatus: e.target.value as RsvpPayload['attendanceStatus'],
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                      >
                        <option value="attending">Attending</option>
                        <option value="not_attending">Not attending</option>
                        <option value="maybe">Maybe</option>
                      </select>
                    </label>

                    <label className="text-sm font-medium text-[#4f3422]">
                      Number of guests
                      <input
                        type="number"
                        min="1"
                        max={guest?.maxGuests || 1}
                        value={form.guestCount}
                        onChange={(e) => setForm((current) => ({ ...current, guestCount: e.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                      />
                    </label>

                    <label className="text-sm font-medium text-[#4f3422] sm:col-span-2">
                      Meal preference
                      <input
                        value={form.mealPreference}
                        onChange={(e) => setForm((current) => ({ ...current, mealPreference: e.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                        placeholder="Vegetarian, vegan, no preference..."
                      />
                    </label>

                    <label className="text-sm font-medium text-[#4f3422] sm:col-span-2">
                      Notes for the host
                      <textarea
                        value={form.notes}
                        onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                        className="mt-2 min-h-28 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                        placeholder="Optional message"
                      />
                    </label>

                    {error && <p className="sm:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                    {success && <p className="sm:col-span-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}
                    {existingResponse?.updatedAt && (
                      <p className="sm:col-span-2 text-xs font-medium uppercase tracking-[0.18em] text-[#9a7a56]">
                        Last updated {new Date(existingResponse.updatedAt).toLocaleString()}
                      </p>
                    )}

                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-[#2d1810] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d] disabled:opacity-60"
                      >
                        {submitting ? 'Saving...' : 'Submit RSVP'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}
