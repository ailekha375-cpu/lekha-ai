'use client';

import { useMemo, useState } from 'react';

import type { ContactRecord } from '../lib/eventTypes';

type NewContactForm = {
  name: string;
  email: string;
  phone: string;
  category: string;
  notes: string;
  defaultGuestCount: string;
};

const INITIAL_CONTACT_FORM: NewContactForm = {
  name: '',
  email: '',
  phone: '',
  category: 'friends',
  notes: '',
  defaultGuestCount: '1',
};

type ExistingRecipientSummary = {
  id: string;
  name: string;
  email?: string;
  category?: string;
};

type RecipientPickerModalProps = {
  contacts: ContactRecord[];
  existingRecipients?: ExistingRecipientSummary[];
  initiallySelectedContactIds: string[];
  eventTitle: string;
  importableGuestCount?: number;
  busy?: boolean;
  onClose: () => void;
  onCreateContact: (payload: Omit<ContactRecord, 'id' | 'uid' | 'createdAt' | 'updatedAt'>) => Promise<ContactRecord>;
  onImportExistingGuests?: () => Promise<ContactRecord[]>;
  onConfirm: (contactIds: string[]) => Promise<void>;
};

export default function RecipientPickerModal({
  contacts,
  existingRecipients = [],
  initiallySelectedContactIds,
  eventTitle,
  importableGuestCount = 0,
  busy = false,
  onClose,
  onCreateContact,
  onImportExistingGuests,
  onConfirm,
}: RecipientPickerModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initiallySelectedContactIds);
  const [query, setQuery] = useState('');
  const [newContact, setNewContact] = useState<NewContactForm>(INITIAL_CONTACT_FORM);
  const [error, setError] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [importingGuests, setImportingGuests] = useState(false);

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return contacts;
    return contacts.filter((contact) =>
      [contact.name, contact.email, contact.phone, contact.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [contacts, query]);

  const selectedCount = selectedIds.length;

  function toggleContact(contactId: string) {
    setSelectedIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId]
    );
  }

  async function handleCreateContact(event: React.FormEvent) {
    event.preventDefault();
    setSavingContact(true);
    setError('');
    try {
      const created = await onCreateContact({
        name: newContact.name.trim(),
        email: newContact.email.trim(),
        phone: newContact.phone.trim(),
        category: newContact.category.trim() || 'friends',
        notes: newContact.notes.trim(),
        defaultGuestCount: Number(newContact.defaultGuestCount || '1') || 1,
      });
      setSelectedIds((current) => [...new Set([...current, created.id])]);
      setNewContact(INITIAL_CONTACT_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact');
    } finally {
      setSavingContact(false);
    }
  }

  async function handleConfirm() {
    if (!selectedIds.length) {
      setError('Select at least one contact to continue.');
      return;
    }
    setError('');
    await onConfirm(selectedIds);
  }

  async function handleImportExistingGuests() {
    if (!onImportExistingGuests) return;
    setImportingGuests(true);
    setError('');
    try {
      const importedContacts = await onImportExistingGuests();
      if (importedContacts.length) {
        setSelectedIds((current) => [...new Set([...current, ...importedContacts.map((contact) => contact.id)])]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import existing recipients');
    } finally {
      setImportingGuests(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#2d1810]/50 px-4 py-5">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-[#e8ddd1] bg-[#fcfaf7] shadow-[0_30px_90px_rgba(45,24,16,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eee2d5] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Choose recipients</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#2d1810]">Send invites for {eventTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6b5b4f]">
              Select saved contacts, or add a new contact here before sending.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#ddcfbe] bg-white px-4 py-2 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4]"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-h-0 border-b border-[#eee2d5] px-6 py-5 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="min-w-[260px] flex-1 text-sm font-medium text-[#4f3422]">
                Search contacts
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                  placeholder="Search by name, email, phone, or category"
                />
              </label>
              <div className="rounded-full bg-[#f5ecdf] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">
                {selectedCount} selected
              </div>
            </div>

            {importableGuestCount > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#eadfd2] bg-[#fff7ec] px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#4f3422]">Bring in existing event recipients</p>
                  <p className="mt-1 text-xs leading-5 text-[#7b624d]">
                    Import the {importableGuestCount} recipient{importableGuestCount === 1 ? '' : 's'} already on this event into your guest book so they can be reused later.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleImportExistingGuests}
                  disabled={importingGuests}
                  className="rounded-full border border-[#ddcfbe] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4330] transition hover:bg-[#fffaf4] disabled:opacity-50"
                >
                  {importingGuests ? 'Importing...' : 'Import existing'}
                </button>
              </div>
            )}

            {existingRecipients.length > 0 && (
              <div className="mt-4 rounded-[20px] border border-[#eadfd2] bg-white px-4 py-4">
                <p className="text-sm font-semibold text-[#4f3422]">Already assigned to this event</p>
                <p className="mt-1 text-xs leading-5 text-[#7b624d]">
                  These recipients are already on this event for RSVP tracking. Saved guest-book contacts appear in the selectable list below.
                </p>
                <div className="mt-3 max-h-32 space-y-2 overflow-y-auto pr-1">
                  {existingRecipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="rounded-[16px] bg-[#fffaf4] px-3 py-3 text-sm text-[#5c4330]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#2d1810]">{recipient.name}</span>
                        <span className="rounded-full bg-[#f5ecdf] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#855d3b]">
                          {recipient.category || 'friends'}
                        </span>
                      </div>
                      {recipient.email && <p className="mt-1 text-xs text-[#7b624d]">{recipient.email}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 max-h-[46vh] space-y-3 overflow-y-auto pr-1">
              {filteredContacts.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#dbcdbf] bg-white px-5 py-8 text-center text-sm text-[#6b5b4f]">
                  No contacts yet. Add one on the right and it will appear here.
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const checked = selectedIds.includes(contact.id);
                  return (
                    <label
                      key={contact.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-[22px] border px-4 py-4 transition ${
                        checked
                          ? 'border-[#d2b48c] bg-[#fff6ea]'
                          : 'border-[#eadfd2] bg-white hover:bg-[#fffaf4]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleContact(contact.id)}
                        className="mt-1 h-4 w-4 rounded border-[#cbb79f] text-[#2d1810] focus:ring-[#d2b48c]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#2d1810]">{contact.name}</p>
                          <span className="rounded-full bg-[#f5ecdf] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#855d3b]">
                            {contact.category || 'friends'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#6b5b4f]">{contact.email || 'No email saved yet'}</p>
                        {(contact.phone || contact.notes) && (
                          <p className="mt-2 text-xs leading-5 text-[#8a6d54]">
                            {[contact.phone, contact.notes].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <p className="text-sm font-semibold text-[#4f3422]">Add a new contact</p>
            <form onSubmit={handleCreateContact} className="mt-4 grid gap-4">
              <label className="text-sm font-medium text-[#4f3422]">
                Name
                <input
                  value={newContact.name}
                  onChange={(e) => setNewContact((current) => ({ ...current, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                  required
                />
              </label>
              <label className="text-sm font-medium text-[#4f3422]">
                Email
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact((current) => ({ ...current, email: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                />
              </label>
              <label className="text-sm font-medium text-[#4f3422]">
                Phone
                <input
                  value={newContact.phone}
                  onChange={(e) => setNewContact((current) => ({ ...current, phone: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#4f3422]">
                  Category
                  <select
                    value={newContact.category}
                    onChange={(e) => setNewContact((current) => ({ ...current, category: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
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
                    value={newContact.defaultGuestCount}
                    onChange={(e) => setNewContact((current) => ({ ...current, defaultGuestCount: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                  />
                </label>
              </div>
              <label className="text-sm font-medium text-[#4f3422]">
                Notes
                <textarea
                  value={newContact.notes}
                  onChange={(e) => setNewContact((current) => ({ ...current, notes: e.target.value }))}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 outline-none focus:border-[#d2b48c]"
                  placeholder="Family of four, college friend, coworker team lead..."
                />
              </label>

              <button
                type="submit"
                disabled={savingContact}
                className="rounded-full border border-[#ddcfbe] bg-white px-4 py-3 text-sm font-semibold text-[#5c4330] transition hover:bg-[#fffaf4] disabled:opacity-50"
              >
                {savingContact ? 'Saving contact...' : 'Save contact to my guest book'}
              </button>
            </form>

            {error && (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3 border-t border-[#eee2d5] pt-5">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="rounded-full bg-[#2d1810] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d] disabled:opacity-50"
              >
                {busy ? 'Sending...' : 'Assign selected contacts and send'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#ddcfbe] px-5 py-3 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
