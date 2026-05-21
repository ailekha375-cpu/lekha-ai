'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Footer from '../components/Footer';
import Header from '../components/Header';
import PageBackButton from '../components/PageBackButton';
import { useAuth } from '../lib/useAuth';
import type { ContactRecord } from '../lib/eventTypes';

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  category: string;
  notes: string;
  defaultGuestCount: string;
};

const INITIAL_FORM: ContactFormState = {
  name: '',
  email: '',
  phone: '',
  category: 'friends',
  notes: '',
  defaultGuestCount: '1',
};

export default function GuestsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      setLoadingContacts(false);
      router.push('/');
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function loadContacts() {
      if (!user) return;
      setLoadingContacts(true);
      setError('');
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/contacts', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load contacts');
        setContacts(Array.isArray(data?.contacts) ? data.contacts : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contacts');
      } finally {
        setLoadingContacts(false);
      }
    }
    if (!loading && user) {
      loadContacts();
    }
  }, [loading, user]);

  const groupedCounts = useMemo(() => {
    return contacts.reduce<Record<string, number>>((acc, contact) => {
      const key = contact.category || 'friends';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [contacts]);

  async function handleCreateContact(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          category: form.category,
          notes: form.notes.trim(),
          defaultGuestCount: Number(form.defaultGuestCount || '1') || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create contact');
      setContacts((current) => [data.contact as ContactRecord, ...current]);
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteContact(contactId: string, name: string) {
    if (!user) return;
    const confirmed = window.confirm(`Delete "${name}" from your guest book?`);
    if (!confirmed) return;
    setDeletingContactId(contactId);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to delete contact');
      setContacts((current) => current.filter((contact) => contact.id !== contactId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
    } finally {
      setDeletingContactId(null);
    }
  }

  return (
    <main className="min-h-screen">
      <Header />
      <PageBackButton fallbackHref="/" />
      <section className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-[#e6ddd2] bg-white/90 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.10)]">
            <div className="mb-5 flex flex-wrap gap-3">
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
                Event hub
              </Link>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">My Guests</p>
            <h1 className="mt-3 text-4xl font-semibold text-[#2d1810]">Build your reusable contact book</h1>
            <p className="mt-4 text-sm leading-7 text-[#6b5b4f]">
              Save family, friends, coworkers, and VIP contacts once, then reuse them across every event.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {Object.entries(groupedCounts).map(([category, count]) => (
                <span
                  key={category}
                  className="rounded-full bg-[#f7efe4] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]"
                >
                  {count} {category}
                </span>
              ))}
              {!contacts.length && (
                <span className="rounded-full bg-[#f7efe4] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">
                  No contacts yet
                </span>
              )}
            </div>

            <form onSubmit={handleCreateContact} className="mt-8 grid gap-4">
              <label className="text-sm font-medium text-[#4f3422]">
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#4f3422]">
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                  />
                </label>
                <label className="text-sm font-medium text-[#4f3422]">
                  Phone
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#4f3422]">
                  Category
                  <select
                    value={form.category}
                    onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                  >
                    <option value="family">Family</option>
                    <option value="friends">Friends</option>
                    <option value="coworkers">Coworkers</option>
                    <option value="vip">VIP</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-[#4f3422]">
                  Default guests
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={form.defaultGuestCount}
                    onChange={(e) => setForm((current) => ({ ...current, defaultGuestCount: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                  />
                </label>
              </div>

              <label className="text-sm font-medium text-[#4f3422]">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                  className="mt-2 min-h-28 w-full rounded-2xl border border-[#ddd1c2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#d2b48c]"
                  placeholder="Family of five, college friends, close coworkers..."
                />
              </label>

              {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !user}
                  className="rounded-full bg-[#2d1810] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d] disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save contact'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-[32px] border border-[#e6ddd2] bg-[#fff9f1]/95 p-6 shadow-[0_20px_70px_rgba(45,24,16,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">Contact library</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#2d1810]">{contacts.length} saved contacts</h2>
            <p className="mt-3 text-sm leading-7 text-[#6b5b4f]">
              These are the people you can choose from when sending invites for any event.
            </p>

            <div className="mt-6 space-y-4">
              {loadingContacts ? (
                <div className="rounded-3xl border border-dashed border-[#dbcdbf] bg-white/80 px-5 py-10 text-center text-sm text-[#6b5b4f]">
                  Loading contacts...
                </div>
              ) : contacts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#dbcdbf] bg-white/80 px-5 py-10 text-center text-sm text-[#6b5b4f]">
                  No contacts yet. Add your first guest contact on the left.
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="rounded-[26px] border border-[#e6d7c6] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-[#2d1810]">{contact.name}</p>
                          <span className="rounded-full bg-[#f3e6d5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#855d3b]">
                            {contact.category || 'friends'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[#6b5b4f]">{contact.email || 'No email saved'}</p>
                        {contact.phone && <p className="mt-1 text-sm text-[#6b5b4f]">{contact.phone}</p>}
                        {contact.notes && <p className="mt-3 text-sm leading-6 text-[#6b5b4f]">{contact.notes}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.id, contact.name)}
                        disabled={deletingContactId === contact.id}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                        aria-label={`Delete ${contact.name}`}
                      >
                        {deletingContactId === contact.id ? '...' : 'x'}
                      </button>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7a56]">
                      Default party size {contact.defaultGuestCount || 1}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
