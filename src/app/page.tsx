'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Footer from './components/Footer';
import Header from './components/Header';
import { useAuth } from './lib/useAuth';
import { useModal } from './components/ModalContext';

const workflowSteps = [
  {
    step: '01',
    title: 'Generate a template',
    body: 'Describe the event vibe in AI Studio and get a design template back, even while placeholder mode is active.',
  },
  {
    step: '02',
    title: 'Customize the invite',
    body: 'Open the invite composer, drag text into place, style the copy, and export a polished final invitation.',
  },
  {
    step: '03',
    title: 'Save everything to an event',
    body: 'Attach the image, email draft, and linked AI chats to one event so your campaign stays organized.',
  },
  {
    step: '04',
    title: 'Invite guests and track RSVPs',
    body: 'Add guests, generate personal RSVP links, and prepare the event for sending and response tracking.',
  },
];

const featureCards = [
  {
    eyebrow: 'AI Studio',
    title: 'Prompt, preview, and refine invite concepts',
    body: 'Use one chat space to generate visual directions, draft invitation copy, and save the pieces that belong to an event.',
    href: '/chat',
    cta: 'Open AI Studio',
  },
  {
    eyebrow: 'Event Hub',
    title: 'Turn creative output into a send-ready event kit',
    body: 'Each event becomes the home for invite art, email text, guest records, and RSVP links.',
    href: '/events',
    cta: 'Open Event Hub',
  },
];

const capabilityList = [
  'AI prompt flow for invite concepts and copy',
  'Template actions for download, editing, and event save',
  'Invitation text editor with exportable PNG output',
  'Event dashboard with guests and RSVP links',
  'Campaign kit with saved image, saved email draft, and linked chats',
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

        <section className="px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pt-10">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[36px] border border-[#eadfd2] bg-[#fcfaf7] p-7 shadow-[0_24px_80px_rgba(45,24,16,0.10)] sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">
                Invitation workflow, end to end
              </p>
              <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] text-[#2d1810] sm:text-6xl">
                Design the invite, save the campaign, then send and track RSVPs from one place.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#6b5b4f] sm:text-lg">
                Lekha is no longer just a template generator. It is becoming your event workspace: create invite art, add text, save email drafts, attach them to an event, and prep the whole thing for guest delivery.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openPrimaryFlow}
                  className="rounded-full bg-[#2d1810] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
                >
                  Start with AI
                </button>
                <Link
                  href="/events"
                  className="rounded-full border border-[#ddcfbe] bg-white px-6 py-3 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f7efe4]"
                >
                  Open Event Hub
                </Link>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] bg-[#f7efe4] px-5 py-4">
                  <p className="text-2xl font-semibold text-[#2d1810]">AI</p>
                  <p className="mt-2 text-sm leading-6 text-[#6b5b4f]">Generate invite concepts and invitation email copy in one chat flow.</p>
                </div>
                <div className="rounded-[24px] bg-[#fff5e8] px-5 py-4">
                  <p className="text-2xl font-semibold text-[#2d1810]">Event</p>
                  <p className="mt-2 text-sm leading-6 text-[#6b5b4f]">Save the final image, email draft, and linked chats into an event campaign kit.</p>
                </div>
                <div className="rounded-[24px] bg-[#eef5eb] px-5 py-4">
                  <p className="text-2xl font-semibold text-[#2d1810]">RSVP</p>
                  <p className="mt-2 text-sm leading-6 text-[#6b5b4f]">Generate guest links today and extend this into full delivery next.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[36px] border border-[#eadfd2] bg-[linear-gradient(180deg,#fffdf9,#f7efe4)] p-6 shadow-[0_24px_80px_rgba(45,24,16,0.08)]">
              <div className="rounded-[28px] border border-[#eadfd2] bg-[#fffdf9] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Live product map</p>
                    <h2 className="mt-3 text-3xl font-semibold text-[#2d1810]">What one event contains</h2>
                  </div>
                  <span className="rounded-full bg-[#f5ecdf] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">
                    Current build
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[24px] border border-[#eadfd2] bg-[#fffaf4] p-4">
                    <p className="text-sm font-semibold text-[#4f3422]">Campaign kit</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[120px_1fr]">
                      <div
                        className="aspect-[3/4] rounded-[20px] border border-[#eadfd2] bg-cover bg-center"
                        style={{ backgroundImage: "url('/wedding.svg')" }}
                      />
                      <div className="space-y-2 text-sm leading-6 text-[#6b5b4f]">
                        <p>Saved invite image</p>
                        <p>Email draft from AI chat</p>
                        <p>Linked conversations that created those assets</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#eadfd2] bg-[#fffaf4] p-4">
                    <p className="text-sm font-semibold text-[#4f3422]">Guest operations</p>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-[18px] bg-white px-4 py-3 text-sm text-[#5b4635]">Manual guest add flow</div>
                      <div className="rounded-[18px] bg-white px-4 py-3 text-sm text-[#5b4635]">Personal RSVP links per guest</div>
                      <div className="rounded-[18px] bg-white px-4 py-3 text-sm text-[#5b4635]">Status-ready layout for sending later</div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#eadfd2] bg-[#fffaf4] p-4">
                    <p className="text-sm font-semibold text-[#4f3422]">Next shipping step</p>
                    <p className="mt-3 text-sm leading-6 text-[#6b5b4f]">
                      Add event-based email sending so the saved image and saved copy can go out directly from the event workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">Workflow</p>
              <h2 className="mt-3 text-4xl font-semibold text-[#2d1810]">How the product should feel</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {workflowSteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[28px] border border-[#eadfd2] bg-[#fffdf9] p-5 shadow-[0_18px_50px_rgba(45,24,16,0.06)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">{item.step}</p>
                  <h3 className="mt-4 text-2xl font-semibold text-[#2d1810]">{item.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#6b5b4f]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
            {featureCards.map((card) => (
              <div
                key={card.title}
                className="rounded-[32px] border border-[#eadfd2] bg-[#fffdf9] p-6 shadow-[0_18px_55px_rgba(45,24,16,0.07)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">{card.eyebrow}</p>
                <h3 className="mt-3 text-3xl font-semibold text-[#2d1810]">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#6b5b4f]">{card.body}</p>
                <Link
                  href={card.href}
                  className="mt-6 inline-flex rounded-full bg-[#2d1810] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
                >
                  {card.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[32px] border border-[#eadfd2] bg-[#fff9f1] p-6 shadow-[0_20px_60px_rgba(45,24,16,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Current capabilities</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#2d1810]">What is already in the app</h2>
              <div className="mt-6 space-y-3">
                {capabilityList.map((item) => (
                  <div key={item} className="rounded-[20px] bg-white px-4 py-3 text-sm font-medium text-[#5b4635]">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[#eadfd2] bg-[#fffdf9] p-6 shadow-[0_20px_60px_rgba(45,24,16,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">Best next action</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#2d1810]">Start an event, then build the campaign around it</h2>
              <p className="mt-4 text-sm leading-7 text-[#6b5b4f]">
                The strongest workflow now is: create an event first, open the AI Studio from that event, then save the invite art and email copy back into the same event workspace.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openPrimaryFlow}
                  className="rounded-full bg-[#2d1810] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
                >
                  Open AI Studio
                </button>
                <Link
                  href="/events"
                  className="rounded-full border border-[#ddcfbe] bg-[#fffaf4] px-6 py-3 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f7efe4]"
                >
                  Create or open an event
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
