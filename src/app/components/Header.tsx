'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { logOut, signIn, signUp } from '../lib/auth';
import { useAuth } from '../lib/useAuth';
import { useModal } from './ModalContext';

const NAV_LINKS = [
  { href: '/#templates', label: 'Templates' },
  { href: '/#how', label: 'How it works' },
];

function RuleIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}
      aria-hidden
    >
      {active ? '✓' : '✕'}
    </span>
  );
}

export default function Header() {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const { showModal, setShowModal } = useModal();
  const { user } = useAuth();
  const router = useRouter();

  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const doPasswordsMatch = password === confirmPassword;

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function openAuth(signup: boolean) {
    setIsSignup(signup);
    setShowModal(true);
    setIsMobileMenuOpen(false);
  }

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (isSignup) {
      if (!isPasswordValid) {
        setError('Password does not meet all requirements.');
        return;
      }
      if (!doPasswordsMatch) {
        setError('Passwords do not match.');
        return;
      }
    }

    try {
      if (isSignup) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }

      setShowModal(false);
      resetForm();
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }

  function resetForm() {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleLogout() {
    await logOut();
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/');
  }

  return (
    <header
      className={`sticky top-0 z-30 w-full px-4 transition-all duration-300 sm:px-6 lg:px-8 ${scrolled ? 'py-2' : 'py-5'}`}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 px-4 ring-1 ring-[#e7d8c4]/60 backdrop-blur transition-all duration-300 md:px-6 ${
          scrolled
            ? 'bg-[#fcfaf7]/95 py-2 shadow-[0_10px_30px_rgba(45,24,16,0.18)]'
            : 'bg-[#fcfaf7]/85 py-3 shadow-[0_18px_45px_rgba(45,24,16,0.12)]'
        }`}
      >
        <Link href="/" className="group flex items-center gap-3">
          <div
            className={`flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f9efdd,#d2b48c)] font-bold text-[#2d1810] shadow-[0_6px_16px_rgba(184,143,92,0.45)] ring-1 ring-white/60 transition-all duration-300 group-hover:-translate-y-0.5 ${
              scrolled ? 'h-9 w-9 text-lg' : 'h-11 w-11 text-xl'
            }`}
            style={{ fontFamily: 'Kaivalya, serif' }}
          >
            L
          </div>
          <p className="text-2xl font-bold text-[#2d1810]" style={{ fontFamily: 'Kaivalya, serif' }}>
            Lekha
          </p>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group relative text-sm font-semibold text-[#6b5b4f] transition hover:text-[#2d1810]"
            >
              {item.label}
              <span
                className="absolute -bottom-1.5 left-0 h-px w-0 bg-[linear-gradient(90deg,#c9a36a,#d2b48c)] transition-all duration-300 group-hover:w-full"
                aria-hidden
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link
                href="/events"
                className="hidden rounded-full bg-[#2d1810] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a2e1d] sm:inline-flex"
              >
                Event Hub
              </Link>
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen((open) => !open)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f0e3d3,#d2b48c)] text-base font-bold text-[#2d1810] shadow-sm"
                  title={user.email || 'Profile'}
                >
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </button>
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[24px] border border-[#eadfd2] bg-white/96 p-2 shadow-[0_20px_50px_rgba(45,24,16,0.14)] backdrop-blur">
                    <div className="border-b border-[#efe3d7] px-4 py-3">
                      <p className="text-sm font-semibold text-[#2d1810]">{user.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#9a7a56]">Host account</p>
                    </div>
                    <Link
                      href="/events"
                      className="mt-2 block rounded-[18px] px-4 py-3 text-sm font-medium text-[#2d1810] transition hover:bg-[#f8f2ea]"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      My events
                    </Link>
                    <Link
                      href="/guests"
                      className="block rounded-[18px] px-4 py-3 text-sm font-medium text-[#2d1810] transition hover:bg-[#f8f2ea]"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      My guests
                    </Link>
                    <Link
                      href="/chat"
                      className="block rounded-[18px] px-4 py-3 text-sm font-medium text-[#2d1810] transition hover:bg-[#f8f2ea]"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      AI Studio
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 block w-full rounded-[18px] px-4 py-3 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuth(false)}
                className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f5eee5] sm:inline-flex"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => openAuth(true)}
                className="group inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#3a2418,#2d1810)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(45,24,16,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(45,24,16,0.34)]"
              >
                Get started
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#2d1810] transition hover:bg-[#f5eee5] md:hidden"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="mx-auto mt-3 max-w-7xl rounded-[24px] border border-[#eadfd2] bg-[#fcfaf7]/96 p-3 shadow-[0_20px_50px_rgba(45,24,16,0.12)] backdrop-blur md:hidden">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f8f2ea]"
            >
              {item.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link href="/events" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f8f2ea]">
                Event Hub
              </Link>
              <Link href="/chat" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f8f2ea]">
                AI Studio
              </Link>
              <Link href="/guests" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f8f2ea]">
                My guests
              </Link>
              <button type="button" onClick={handleLogout} className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                Log out
              </button>
            </>
          ) : (
            <div className="mt-1 flex gap-2 px-1 pb-1">
              <button
                type="button"
                onClick={() => openAuth(false)}
                className="flex-1 rounded-full border border-[#ddcfbe] bg-white px-4 py-2.5 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f7efe4]"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => openAuth(true)}
                className="flex-1 rounded-full bg-[#2d1810] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
              >
                Get started
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d1810]/45 px-4 py-6">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/45 bg-[#fcfaf7] shadow-2xl">
            <div className="border-b border-[#eee2d5] bg-[linear-gradient(135deg,#fffdf9,#f5eee5)] px-7 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">Welcome to Lekha</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#2d1810]">
                {isSignup ? 'Create your host account' : 'Log in to your workspace'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6b5b4f]">
                Save invite drafts, manage guests, and keep every RSVP in one place.
              </p>
            </div>

            <button
              type="button"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#e8dccc] text-[#6b5b4f] transition hover:bg-white"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              aria-label="Close auth dialog"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <form onSubmit={handleAuth} className="space-y-5 px-7 py-7">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#4f3422]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="host@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 text-black outline-none transition focus:border-[#d2b48c] focus:ring-2 focus:ring-[#d2b48c]/30"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#4f3422]">
                  {isSignup ? 'Create password' : 'Password'}
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 pr-12 text-black outline-none transition focus:border-[#d2b48c] focus:ring-2 focus:ring-[#d2b48c]/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7c6a5c] transition hover:text-[#2d1810]"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {isSignup && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#4f3422]">
                    Confirm password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-2xl border border-[#ddd1c2] bg-white px-4 py-3 pr-12 text-black outline-none transition focus:border-[#d2b48c] focus:ring-2 focus:ring-[#d2b48c]/30"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7c6a5c] transition hover:text-[#2d1810]"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              )}

              {isSignup && password && (
                <div className="rounded-3xl border border-[#eee2d5] bg-[#f8f3eb] p-4">
                  <h4 className="text-sm font-semibold text-[#4f3422]">Password requirements</h4>
                  <div className="mt-3 space-y-2 text-sm text-[#5b4635]">
                    <div className="flex items-start gap-3"><RuleIndicator active={passwordRules.length} /><span>At least 8 characters</span></div>
                    <div className="flex items-start gap-3"><RuleIndicator active={passwordRules.uppercase} /><span>At least 1 uppercase letter</span></div>
                    <div className="flex items-start gap-3"><RuleIndicator active={passwordRules.lowercase} /><span>At least 1 lowercase letter</span></div>
                    <div className="flex items-start gap-3"><RuleIndicator active={passwordRules.digit} /><span>At least 1 number</span></div>
                    <div className="flex items-start gap-3"><RuleIndicator active={passwordRules.special} /><span>At least 1 special character</span></div>
                  </div>
                  {confirmPassword && (
                    <p className={`mt-3 text-sm font-medium ${doPasswordsMatch ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {doPasswordsMatch ? 'Passwords match.' : 'Passwords do not match.'}
                    </p>
                  )}
                </div>
              )}

              {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

              <button
                type="submit"
                className="w-full rounded-full bg-[#2d1810] py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
              >
                {isSignup ? 'Create account' : 'Continue'}
              </button>
            </form>

            <div className="border-t border-[#eee2d5] px-7 py-5 text-center">
              <button
                type="button"
                className="text-sm font-medium text-[#8a6d54] transition hover:text-[#2d1810]"
                onClick={() => {
                  setIsSignup((current) => !current);
                  resetForm();
                }}
              >
                {isSignup ? 'Already have an account? Log in' : "Don't have an account yet? Sign up"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
