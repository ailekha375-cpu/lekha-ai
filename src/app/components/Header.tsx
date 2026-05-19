'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { logOut, signIn, signUp } from '../lib/auth';
import { useAuth } from '../lib/useAuth';
import { useModal } from './ModalContext';

const SERVICE_LINKS = [
  { href: '/chat', label: 'Design with AI', description: 'Generate invite art and open the composer.' },
  { href: '/events', label: 'Create Events', description: 'Save event details and set RSVP deadlines.' },
  { href: '/events', label: 'Invite Guests', description: 'Add guest records and create personal RSVP links.' },
  { href: '/responses', label: 'Track RSVPs', description: 'Open RSVP dashboards for your events and review responses.' },
];

function RuleIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}
      aria-hidden
    >
      {active ? 'OK' : 'NO'}
    </span>
  );
}

export default function Header() {
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsServicesDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-30 w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/60 bg-[#fcfaf7]/88 px-4 py-3 shadow-[0_16px_40px_rgba(45,24,16,0.10)] backdrop-blur md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f4eadb,#d2b48c)] text-lg font-bold text-[#2d1810] shadow-sm">
              L
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2d1810]" style={{ fontFamily: 'Kaivalya, serif' }}>
                Lekha
              </p>
              <p className="hidden text-xs uppercase tracking-[0.28em] text-[#8a6d54] sm:block">
                Invite Studio
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6">
          <div className="relative hidden sm:block" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsServicesDropdownOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f5eee5]"
            >
              Services
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${isServicesDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isServicesDropdownOpen && (
              <div className="absolute right-0 mt-3 w-[320px] overflow-hidden rounded-[24px] border border-[#eadfd2] bg-white/96 p-2 shadow-[0_20px_50px_rgba(45,24,16,0.14)] backdrop-blur">
                {SERVICE_LINKS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block rounded-[18px] px-4 py-3 transition hover:bg-[#f8f2ea]"
                    onClick={() => setIsServicesDropdownOpen(false)}
                  >
                    <p className="text-sm font-semibold text-[#2d1810]">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#6b5b4f]">{item.description}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/chat"
            className="hidden rounded-full border border-[#ddcfbe] px-4 py-2 text-sm font-semibold text-[#6b5b4f] transition hover:bg-[#f7efe4] md:inline-flex"
          >
            AI Studio
          </Link>
          <Link
            href="/events"
            className="rounded-full bg-[#2d1810] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4a2e1d] md:px-5"
          >
            Event Hub
          </Link>

          {user ? (
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
                    href="/chat"
                    className="block rounded-[18px] px-4 py-3 text-sm font-medium text-[#2d1810] transition hover:bg-[#f8f2ea]"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    AI invite studio
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
          ) : (
            <button
              type="button"
              className="rounded-full border border-[#d7c8b8] bg-white px-4 py-2 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f7efe4]"
              onClick={() => setShowModal(true)}
            >
              Login / Signup
            </button>
          )}
        </nav>
      </div>

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
              className="absolute right-5 top-5 rounded-full border border-[#e8dccc] px-3 py-1 text-lg text-[#6b5b4f] transition hover:bg-white"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              aria-label="Close auth dialog"
            >
              x
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
