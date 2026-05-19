'use client';

import { useRouter } from 'next/navigation';

type PageBackButtonProps = {
  fallbackHref?: string;
  label?: string;
  preferHistory?: boolean;
};

export default function PageBackButton({
  fallbackHref = '/',
  label = 'Back',
  preferHistory = true,
}: PageBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (preferHistory && typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="fixed left-2 top-11 z-40 inline-flex items-center gap-2 rounded-full border border-[#ddcfbe] bg-white/96 px-4 py-2 text-sm font-semibold text-[#6b5b4f] shadow-[0_12px_30px_rgba(45,24,16,0.10)] backdrop-blur transition hover:bg-[#f7efe4] sm:left-3 lg:left-4"
      aria-label={label}
    >
      <span aria-hidden>←</span>
      <span>{label}</span>
    </button>
  );
}
