'use client';

import { Suspense } from 'react';

import ChatbotModal from '../components/ChatbotModal';
import PageBackButton from '../components/PageBackButton';

export default function ChatPage() {
  return (
    <>
      <PageBackButton fallbackHref="/" />
      <Suspense fallback={<div className="min-h-[60vh] px-6 py-12 text-sm text-[#6b5b4f]">Loading AI Studio...</div>}>
        <ChatbotModal asPage />
      </Suspense>
    </>
  );
}
