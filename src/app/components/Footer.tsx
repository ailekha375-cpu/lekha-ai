import Link from 'next/link';

const footerLinks = [
  { href: '/chat', label: 'AI invite studio' },
  { href: '/events', label: 'Event hub' },
  { href: '/responses', label: 'Guest tracking' },
  { href: '/responses', label: 'RSVP dashboards' },
];

export default function Footer() {
  return (
    <footer className="px-4 pb-10 pt-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[32px] border border-[#eadfd2] bg-[#fcfaf7]/92 px-6 py-8 shadow-[0_20px_60px_rgba(45,24,16,0.08)] backdrop-blur">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f4eadb,#d2b48c)] text-xl font-bold text-[#2d1810]">
                L
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#2d1810]" style={{ fontFamily: 'Kaivalya, serif' }}>
                  Lekha
                </h3>
                <p className="text-sm text-[#6b5b4f]">Create, personalize, send, and track invitations from one flow.</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#6b5b4f]">
              The current build supports AI-assisted invite design, editable invitation overlays, event setup, guest records, and personal RSVP links.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {footerLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-2xl border border-[#e7dbcd] bg-white px-4 py-3 text-sm font-semibold text-[#2d1810] transition hover:-translate-y-0.5 hover:bg-[#f8f2ea]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-[#efe3d7] pt-6 text-sm text-[#6b5b4f] md:flex-row md:items-center md:justify-between">
          <p>Copyright 2026 Lekha. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <a href="#" className="transition hover:text-[#2d1810]">Privacy Policy</a>
            <a href="#" className="transition hover:text-[#2d1810]">Terms of Service</a>
            <a href="#" className="transition hover:text-[#2d1810]">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
