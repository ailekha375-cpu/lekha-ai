'use client';

type ImageActionModalProps = {
  imageSrc: string;
  onClose: () => void;
  onDownloadTemplate: () => void;
  onCreateInvite: () => void;
  onSaveToEvent: () => void;
};

export default function ImageActionModal({
  imageSrc,
  onClose,
  onDownloadTemplate,
  onCreateInvite,
  onSaveToEvent,
}: ImageActionModalProps) {
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-[#2d1810]/65 px-4 py-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/35 bg-[#fcfaf7] shadow-2xl">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border-b border-[#e7ddd2] bg-[#f5eee5] p-4 lg:border-b-0 lg:border-r">
            <div
              className="aspect-[3/4] w-full rounded-[24px] bg-cover bg-center shadow-[0_20px_60px_rgba(45,24,16,0.16)]"
              style={{ backgroundImage: `url("${imageSrc}")` }}
            />
          </div>
          <div className="flex flex-col justify-between gap-6 p-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">
                Invitation Template
              </p>
              <h2 className="text-3xl font-semibold leading-tight text-[#2d1810]">
                What would you like to do with this design?
              </h2>
              <p className="text-sm leading-6 text-[#6b5b4f]">
                Download the raw background as a template, or open the invitation composer and turn it
                into a finished invite with editable text.
              </p>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={onDownloadTemplate}
                className="rounded-2xl bg-[#d2b48c] px-5 py-4 text-left text-black transition hover:bg-[#c8a979]"
              >
                <span className="block text-base font-semibold">Download template</span>
                <span className="mt-1 block text-sm text-black/70">
                  Save the background exactly as it is.
                </span>
              </button>
              <button
                type="button"
                onClick={onCreateInvite}
                className="rounded-2xl bg-[#2d1810] px-5 py-4 text-left text-white transition hover:bg-[#4a2e1d]"
              >
                <span className="block text-base font-semibold">Create invite</span>
                <span className="mt-1 block text-sm text-white/75">
                  Open the text editor and export a finished invitation.
                </span>
              </button>
              <button
                type="button"
                onClick={onSaveToEvent}
                className="rounded-2xl border border-[#dbcdbf] bg-white px-5 py-4 text-left text-[#2d1810] transition hover:bg-[#f8f1e8]"
              >
                <span className="block text-base font-semibold">Save to event</span>
                <span className="mt-1 block text-sm text-[#6b5b4f]">
                  Attach this template to an event as a reusable campaign asset.
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-[#dbcdbf] px-5 py-3 text-sm font-medium text-[#6b5b4f] transition hover:bg-[#f8f1e8]"
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
