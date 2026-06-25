'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import Footer from './components/Footer';
import Header from './components/Header';
import InviteCard from './components/InviteCard';
import TemplateGallery from './components/TemplateGallery';
import { heroInvite, heroBackInvite, heroFanInvite, heroThumbs } from './lib/inviteSamples';
import { useAuth } from './lib/useAuth';
import { useModal } from './components/ModalContext';

const workflowSteps = [
  { step: '01', title: 'Describe it', body: 'Tell the AI about your event.' },
  { step: '02', title: 'AI designs', body: 'Get invitation artwork back.' },
  { step: '03', title: 'Make it yours', body: 'Drop in names and details.' },
  { step: '04', title: 'Send & track', body: 'Share links, watch RSVPs arrive.' },
];

const guestRows = [
  { name: 'Olivia Bennett', status: 'Attending' },
  { name: 'Liam Carter', status: 'Pending' },
  { name: 'Sophia Müller', status: 'Attending' },
];

export default function Home() {
  const router = useRouter();
  const { setShowModal } = useModal();
  const { user } = useAuth();

  const openPrimaryFlow = () => {
    if (user) {
      router.push('/chat');
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <main className="min-h-screen">
        <Header />

        <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-14">
          <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2">
            <div className="flex flex-col justify-center">
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">
                <span className="h-px w-8 bg-[linear-gradient(90deg,#c9a36a,transparent)]" aria-hidden />
                AI invitations &amp; RSVPs
              </p>
              <h1
                className="mt-5 max-w-2xl text-5xl leading-[1.08] tracking-normal text-[#2d1810] sm:text-6xl lg:text-7xl"
                style={{ fontFamily: 'Kaivalya, serif' }}
              >
                Every celebration starts here.
              </h1>
              <p className="mt-6 max-w-md text-lg leading-8 text-[#6b5b4f]">
                Describe your event - AI designs the invite. Send it, then track every reply.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={openPrimaryFlow}
                  className="rounded-full bg-[#2d1810] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
                >
                  Start with AI
                </button>
                <a
                  href="#templates"
                  className="text-sm font-semibold text-[#6b5b4f] underline-offset-4 transition hover:text-[#2d1810] hover:underline"
                >
                  Browse templates →
                </a>
              </div>

              <div className="mt-10 flex items-center gap-4">
                <div className="flex">
                  {heroThumbs.map((s, i) => (
                    <div
                      key={s.id}
                      className={`relative h-12 w-9 overflow-hidden rounded-lg border-2 border-[#f6f1ea] shadow-sm ${i > 0 ? '-ml-3' : ''}`}
                    >
                      <Image src={s.src} alt="" fill sizes="40px" className="object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-sm leading-6 text-[#6b5b4f]">
                  Designed by AI for weddings, birthdays,
                  <br className="hidden sm:block" /> brunches &amp; every celebration.
                </p>
              </div>
            </div>

            <div className="relative mx-auto flex aspect-[1.15/1] w-full max-w-[480px] items-center justify-center">
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute left-[4%] top-[6%] h-44 w-44 rounded-full bg-[#e7c9a0]/55 blur-3xl" />
                <div className="absolute bottom-[4%] right-[4%] h-52 w-52 rounded-full bg-[#e4c2d6]/45 blur-3xl" />
                <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4ddae]/55 blur-3xl" />
              </div>

              <motion.svg
                className="absolute right-[6%] top-[2%] h-6 w-6"
                viewBox="0 0 24 24"
                aria-hidden
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1, 0.85] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
              >
                <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill="#cda35f" />
              </motion.svg>
              <motion.svg
                className="absolute bottom-[12%] left-[2%] h-4 w-4"
                viewBox="0 0 24 24"
                aria-hidden
                animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }}
              >
                <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill="#cda35f" />
              </motion.svg>

              <motion.div
                initial={{ opacity: 0, y: 22, rotate: -12 }}
                animate={{ opacity: 1, y: 0, rotate: -10 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.08 }}
                className="absolute left-0 top-[6%] hidden w-[44%] sm:block"
                aria-hidden
              >
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}>
                  <InviteCard sample={heroBackInvite} />
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 22, rotate: 12 }}
                animate={{ opacity: 1, y: 0, rotate: 10 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.16 }}
                className="absolute bottom-[4%] right-0 hidden w-[44%] sm:block"
                aria-hidden
              >
                <motion.div animate={{ y: [0, 9, 0] }} transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 0.5 }}>
                  <InviteCard sample={heroFanInvite} />
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 28, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                whileHover={{ rotate: 0, y: -6 }}
                className="relative z-10 w-[60%] max-w-[280px]"
              >
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}>
                  <InviteCard sample={heroInvite} priority />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="templates" className="scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">Template gallery</p>
              <h2 className="mt-3 text-4xl font-semibold text-[#2d1810]">Every style is designed by AI</h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#6b5b4f]">
                Pick a look, add your details. Real outputs, placeholder text.
              </p>
            </div>
            <TemplateGallery />
          </div>
        </section>

        <section id="how" className="scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">How it works</p>
              <h2 className="mt-3 text-4xl font-semibold text-[#2d1810]">From idea to RSVP in four steps</h2>
            </div>

            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {workflowSteps.map((item, i) => (
                <div key={item.step} className="relative flex flex-col items-center text-center">
                  {i < workflowSteps.length - 1 && (
                    <div
                      className="pointer-events-none absolute left-1/2 top-7 hidden h-px w-[calc(100%+1.5rem)] bg-[#e7dccd] lg:block"
                      aria-hidden
                    />
                  )}
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-[#e7dccd] bg-[#fcfaf7] text-sm font-semibold tracking-[0.1em] text-[#9a7a56]">
                    {item.step}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-[#2d1810]">{item.title}</h3>
                  <p className="mt-2 max-w-[15rem] text-sm leading-6 text-[#6b5b4f]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-16 lg:space-y-24">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">AI Studio</p>
                <h3 className="mt-3 text-4xl font-semibold text-[#2d1810]">Design invites with AI</h3>
                <p className="mt-4 max-w-md text-base leading-7 text-[#6b5b4f]">
                  Describe the occasion in plain words. Lekha designs the artwork and writes the wording in one chat then saves it straight to your event.
                </p>
                <Link
                  href="/chat"
                  className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#2d1810] underline-offset-4 transition hover:underline"
                >
                  Open AI Studio →
                </Link>
              </div>

              <div className="rounded-[28px] bg-[#fcf7ef] p-6 sm:p-8">
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-[#2d1810] px-4 py-3 text-sm leading-6 text-[#f6ead0]">
                  Design a rustic autumn wedding invite for Emma &amp; James.
                </div>
                <div className="mt-3 max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-6 text-[#5b4635] shadow-sm">
                  Here are a few directions - pick one to refine.
                </div>
                <div className="mt-4 flex gap-3">
                  {heroThumbs.slice(0, 3).map((s) => (
                    <div key={s.id} className="relative h-28 w-20 overflow-hidden rounded-xl border border-[#eadfd2] shadow-sm">
                      <Image src={s.src} alt="" fill sizes="80px" className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="lg:order-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">Event Hub</p>
                <h3 className="mt-3 text-4xl font-semibold text-[#2d1810]">Run the whole event</h3>
                <p className="mt-4 max-w-md text-base leading-7 text-[#6b5b4f]">
                  Keep the invite, your guest list, and every RSVP in one place with a personal link for each guest and live reply tracking.
                </p>
                <Link
                  href="/events"
                  className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#2d1810] underline-offset-4 transition hover:underline"
                >
                  Open Event Hub →
                </Link>
              </div>

              <div className="rounded-[28px] bg-[#fcf7ef] p-6 sm:p-8 lg:order-1">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#2d1810]">Emma &amp; James · Guests</p>
                    <span className="rounded-full bg-[#eef5eb] px-3 py-1 text-xs font-semibold text-[#4f7a43]">18 attending</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {guestRows.map((g) => (
                      <div key={g.name} className="flex items-center justify-between rounded-xl bg-[#faf6f0] px-4 py-3">
                        <span className="text-sm text-[#5b4635]">{g.name}</span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            g.status === 'Attending' ? 'bg-[#eef5eb] text-[#4f7a43]' : 'bg-[#f5ecdf] text-[#9a7a56]'
                          }`}
                        >
                          {g.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-[36px] border border-[#eadfd2] bg-[#fff9f1] p-10 text-center shadow-[0_20px_60px_rgba(45,24,16,0.08)] sm:p-14">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">Ready when you are</p>
            <h2 className="mt-3 text-4xl font-semibold text-[#2d1810]">Make your first invitation tonight</h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#6b5b4f]">
              Describe the occasion and see a design in seconds.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={openPrimaryFlow}
                className="rounded-full bg-[#2d1810] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
              >
                Start with AI
              </button>
              <Link
                href="/events"
                className="rounded-full border border-[#ddcfbe] bg-white px-7 py-3 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f7efe4]"
              >
                Create an event
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
