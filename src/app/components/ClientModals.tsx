'use client';

import { useModal } from './ModalContext';
import ChatbotModal from './ChatbotModal';

export default function ClientModals() {
  const { showChatModal } = useModal();
  return showChatModal ? <ChatbotModal /> : null;
}
