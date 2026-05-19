'use client';

import ChatbotModal from '../components/ChatbotModal';
import PageBackButton from '../components/PageBackButton';

export default function ChatPage() {
  return (
    <>
      <PageBackButton fallbackHref="/" />
      <ChatbotModal asPage />
    </>
  );
}
