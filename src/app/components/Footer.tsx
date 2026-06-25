import Link from 'next/link';

const productLinks = [
  { href: '/chat', label: 'AI Studio' },
  { href: '/events', label: 'Event Hub' },
  { href: '/#templates', label: 'Templates' },
  { href: '/responses', label: 'RSVP tracking' },
];

const companyLinks = [
  { href: '#', label: 'Privacy Policy' },
  { href: '#', label: 'Terms of Service' },
  { href: '#', label: 'Support' },
];

export default function Footer() {
  return (
    <footer className="px-4 pb-10 pt-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-[#eadfd2] bg-[#fcfaf7]/92 shadow-[0_20px_60px_rgba(45,24,16,0.08)] backdrop-blur">
        <div className="grid gap-10 px-8 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f4eadb,#d2b48c)] text-xl font-bold text-[#2d1810]">
                L
              </div>
              <h3 className="text-2xl font-bold text-[#2d1810]" style={{ fontFamily: 'Kaivalya, serif' }}>
                Lekha
              </h3>
            </div>
            <p className="mt-5 text-sm leading-7 text-[#6b5b4f]">
              Beautiful AI-designed invitations — created, personalized, sent, and tracked from one calm workspace.
            </p>
            <Link
              href="/chat"
              className="mt-6 inline-flex rounded-full bg-[#2d1810] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
            >
              Start with AI
            </Link>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Product</p>
            <ul className="mt-5 space-y-3">
              {productLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-[#5b4635] transition hover:text-[#2d1810]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Company</p>
            <ul className="mt-5 space-y-3">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm text-[#5b4635] transition hover:text-[#2d1810]">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#efe3d7] px-8 py-6 text-sm text-[#6b5b4f] sm:px-10 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Lekha. All rights reserved.</p>
          <p className="text-[#9a7a56]">Made with care for every celebration.</p>
        </div>
      </div>
    </footer>
  );
}
