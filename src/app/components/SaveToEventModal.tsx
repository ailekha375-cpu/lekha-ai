'use client';

import type { EventRecord } from '../lib/eventTypes';

type SaveToEventModalProps = {
  title: string;
  description: string;
  events: EventRecord[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function SaveToEventModal({
  title,
  description,
  events,
  selectedEventId,
  onSelectEvent,
  onClose,
  onConfirm,
}: SaveToEventModalProps) {
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#2d1810]/65 px-4 py-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/35 bg-[#fcfaf7] shadow-2xl">
        <div className="border-b border-[#eadfd2] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Save to Event</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#2d1810]">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-[#6b5b4f]">{description}</p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {events.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#dbcdbf] bg-[#fffaf4] px-5 py-8 text-center text-sm text-[#6b5b4f]">
              Create an event first, then come back here to attach this asset to it.
            </div>
          ) : (
            <div className="grid gap-3">
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelectEvent(event.id)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    selectedEventId === event.id
                      ? 'border-[#d2b48c] bg-[#f8f1e8]'
                      : 'border-[#eadfd2] bg-white hover:bg-[#fbf6ef]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-[#2d1810]">{event.title}</p>
                      <p className="mt-1 text-sm capitalize text-[#8a6d54]">{event.eventType || 'event'}</p>
                    </div>
                    <span className="rounded-full bg-[#f5ecdf] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#855d3b]">
                      {event.status || 'draft'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#eadfd2] px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#d7cec2] px-4 py-2 text-sm font-medium text-[#4f3422] transition hover:bg-[#f2ece3]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!selectedEventId || events.length === 0}
            className="rounded-full bg-[#2d1810] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save to selected event
          </button>
        </div>
      </div>
    </div>
  );
}
