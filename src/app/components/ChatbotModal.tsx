'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useModal } from './ModalContext';
import { useAuth } from '../lib/useAuth';
import ChatPanelPoppers from './ChatPanelPoppers';
import ImageActionModal from './ImageActionModal';
import InviteEditorModal from './InviteEditorModal';
import SaveToEventModal from './SaveToEventModal';
import { sanitizeEmailDraft } from '../lib/emailDraft';
import type { EventRecord } from '../lib/eventTypes';
import {
  linkChatToEvent,
  saveEmailDraftToEvent,
  saveInviteAssetToEvent,
} from '../lib/eventCampaignApi';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageBase64?: string;
  imageUrl?: string;
  action?: {
    type: 'confirmSendInvites';
    eventId: string;
    eventTitle: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    resultSummary?: string;
  };
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  conversationId?: string | null;
};

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your invitation assistant. Describe your event and I'll help create designs for you. While the backend is off, you can also try the demo template below and open the invite editor right away.",
  imageUrl: '/wedding.svg',
};

function getChatTitle(messages: Message[]): string {
  const firstUser = messages.find((message) => message.role === 'user');
  if (!firstUser) return 'New chat';
  const text = firstUser.content.trim();
  return text.length > 28 ? `${text.slice(0, 28)}...` : text;
}

const CHAT_STORAGE_KEY = 'lekha-chat-state';

function loadChatFromStorage(): {
  chatHistory: ChatSession[];
  currentChat: Message[];
  activeChatId: string | null;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      chatHistory?: ChatSession[];
      currentChat?: Message[];
      activeChatId?: string | null;
    };
    if (parsed?.chatHistory && Array.isArray(parsed.chatHistory) && parsed?.currentChat && Array.isArray(parsed.currentChat)) {
      return {
        chatHistory: parsed.chatHistory,
        currentChat: parsed.currentChat,
        activeChatId: parsed.activeChatId ?? null,
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveChatToStorage(chatHistory: ChatSession[], currentChat: Message[], activeChatId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify({ chatHistory, currentChat, activeChatId })
    );
  } catch {
    // ignore quota / storage errors
  }
}

function formatSessionDate(createdAt: number): string {
  return new Date(createdAt).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEventMeta(value?: string | null) {
  if (!value) return 'Not set';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function isSendInvitePrompt(text: string) {
  const normalized = text.trim().toLowerCase();
  return (
    /\bsend\b/.test(normalized) &&
    /\b(invite|invites|email|emails)\b/.test(normalized)
  ) || /\bsend to (all|everyone|pending)\b/.test(normalized);
}

function ImageMessage({
  imageUrl,
  imageBase64,
  getImageDataUrl,
  onOpenActions,
}: {
  imageUrl?: string;
  imageBase64?: string;
  getImageDataUrl: (b64: string) => string;
  onOpenActions: (urlOrB64: string) => void;
}) {
  const [error, setError] = useState(false);
  const src = imageBase64
    ? getImageDataUrl(imageBase64)
    : imageUrl
      ? imageUrl.startsWith('http')
        ? `/api/image?url=${encodeURIComponent(imageUrl)}`
        : imageUrl
      : '';

  if (!src) return null;

  if (error && (imageUrl || imageBase64)) {
    return (
      <div className="rounded-lg bg-white p-3 space-y-1">
        <p className="text-sm text-gray-600">Image could not be loaded.</p>
        {imageUrl && imageUrl.startsWith('http') && (
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
          >
            Open in new tab
          </a>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenActions(imageUrl || imageBase64!)}
      className="block w-full max-w-full max-h-64 overflow-hidden rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#d2b48c] focus:ring-offset-1"
      title="Open template actions"
    >
      {/* Dynamic base64/remote AI-generated image — next/image optimization does not apply */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Generated design"
        className="h-auto max-h-64 w-full max-w-full cursor-pointer rounded-lg bg-white object-contain hover:opacity-95"
        onError={() => setError(true)}
      />
    </button>
  );
}

type ChatbotModalProps = { asPage?: boolean };

type PendingEventSave =
  | {
      type: 'template';
      imageSrc: string;
    }
  | {
      type: 'finalInvite';
      imageSrc: string;
    }
  | {
      type: 'emailDraft';
      content: string;
      messageId: string;
    };

export default function ChatbotModal({ asPage = false }: ChatbotModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showChatModal, setShowChatModal } = useModal();
  const { user, loading: authLoading } = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChat, setCurrentChat] = useState<Message[]>([WELCOME_MESSAGE]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasSlidIn, setHasSlidIn] = useState(false);
  const [actionImage, setActionImage] = useState<string | null>(null);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState('');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [pendingEventSave, setPendingEventSave] = useState<PendingEventSave | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const skipNextPersistRef = useRef(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const latestGeneratedImage = useMemo(
    () =>
      [...currentChat]
        .reverse()
        .find((message) => message.role === 'assistant' && (message.imageUrl || message.imageBase64)) ?? null,
    [currentChat]
  );

  const latestTextResult = useMemo(
    () =>
      [...currentChat]
        .reverse()
        .find(
          (message) =>
            message.role === 'assistant' &&
            !message.imageUrl &&
            !message.imageBase64 &&
            message.id !== 'welcome'
        ) ?? null,
    [currentChat]
  );

  useEffect(() => {
    const stored = loadChatFromStorage();
    if (stored?.chatHistory?.length || stored?.currentChat?.length) {
      setChatHistory(stored.chatHistory ?? []);
      setCurrentChat(stored.currentChat?.length ? stored.currentChat : [WELCOME_MESSAGE]);
      setActiveChatId(stored.activeChatId ?? null);
    }
  }, []);

  useEffect(() => {
    const eventId = searchParams.get('eventId');
    if (eventId) {
      setSelectedEventId(eventId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (asPage) {
      setHasSlidIn(true);
      return;
    }
    if (showChatModal) {
      setHasSlidIn(false);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setHasSlidIn(true));
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [showChatModal, asPage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat, isTyping]);

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    saveChatToStorage(chatHistory, currentChat, activeChatId);
  }, [chatHistory, currentChat, activeChatId]);

  useEffect(() => {
    if (!(showChatModal || asPage)) return;
    if (authLoading) return;
    if (user) {
      loadSessions();
      loadEvents();
    } else {
      setChatHistory([]);
      setCurrentChat([WELCOME_MESSAGE]);
      setActiveChatId(null);
      setEvents([]);
      setSelectedEventId(null);
      saveChatToStorage([], [WELCOME_MESSAGE], null);
    }
    // loadSessions/loadEvents intentionally omitted — this effect re-runs only on auth/modal state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChatModal, asPage, user, authLoading]);

  const loadSessions = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/sessions', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return;
      const sessions = await res.json();
      if (Array.isArray(sessions)) {
        skipNextPersistRef.current = true;
        setChatHistory((prev) => {
          const backendSessions = sessions.map((session: { conversationId: string; title: string; createdAt: string; updatedAt: string }) => ({
            id: session.conversationId,
            title: session.title || 'Chat',
            messages: [],
            createdAt: new Date(session.createdAt || session.updatedAt).getTime(),
            conversationId: session.conversationId,
          }));
          const backendIds = new Set(backendSessions.map((session: ChatSession) => session.id));
          const localOnly = prev.filter((session) => session.conversationId == null && !backendIds.has(session.id));
          return [...backendSessions, ...localOnly];
        });
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setSessionNotice('We could not refresh your chat history, but your local draft is still available.');
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    if (!user) return null;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/sessions/${conversationId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.messages && Array.isArray(data.messages)) {
        const messages: Message[] = data.messages.map((message: { role: string; type: string; content: string }, idx: number) => ({
          id: `msg-${conversationId}-${idx}`,
          role: message.role === 'user' ? 'user' : 'assistant',
          content: message.type === 'image' ? '[Generated image]' : message.content,
          ...(message.type === 'image' && message.content ? { imageUrl: message.content } : {}),
        }));
        return messages;
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
    return null;
  };

  const loadEvents = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/events', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const nextEvents = Array.isArray(data?.events) ? (data.events as EventRecord[]) : [];
      setEvents(nextEvents);
      if (!selectedEventId && nextEvents[0]?.id) {
        setSelectedEventId(nextEvents[0].id);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const linkActiveConversationToSelectedEvent = async (conversationId?: string | null) => {
    if (!selectedEventId || !conversationId || !user) return;
    const session = chatHistory.find((entry) => entry.conversationId === conversationId || entry.id === conversationId);
    const title = session?.title || getChatTitle(currentChat);
    try {
      const idToken = await user.getIdToken();
      await linkChatToEvent(selectedEventId, idToken, {
        conversationId,
        title,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to link chat to event:', err);
    }
  };

  const replaceMessageActionState = (
    messageId: string,
    updater: (message: Message) => Message
  ) => {
    setCurrentChat((prev) => prev.map((message) => (message.id === messageId ? updater(message) : message)));
    setChatHistory((prev) =>
      prev.map((session) =>
        session.id === activeChatId
          ? {
              ...session,
              messages: session.messages.map((message) => (message.id === messageId ? updater(message) : message)),
            }
          : session
      )
    );
  };

  const runSendInvitesFromChat = async (messageId: string, eventId: string) => {
    if (!user) return;

    replaceMessageActionState(messageId, (message) => ({
      ...message,
      action: message.action
        ? {
            ...message.action,
            status: 'running',
            resultSummary: 'Sending invite emails now...',
          }
        : message.action,
    }));

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/events/${eventId}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || `Request failed (${response.status})`);
      }

      const sentCount = Number(data?.sentCount || 0);
      const skippedCount = Array.isArray(data?.results)
        ? data.results.filter((result: { status?: string }) => result.status === 'skipped').length
        : 0;
      const summary = skippedCount
        ? `Sent ${sentCount} invite email${sentCount === 1 ? '' : 's'} and skipped ${skippedCount}.`
        : `Sent ${sentCount} invite email${sentCount === 1 ? '' : 's'}.`;

      replaceMessageActionState(messageId, (message) => ({
        ...message,
        action: message.action
          ? {
              ...message.action,
              status: 'done',
              resultSummary: summary,
            }
          : message.action,
      }));
      setSessionNotice(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invites.';
      replaceMessageActionState(messageId, (chatMessage) => ({
        ...chatMessage,
        action: chatMessage.action
          ? {
              ...chatMessage.action,
              status: 'failed',
              resultSummary: message,
            }
          : chatMessage.action,
      }));
      setSessionNotice(message);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    if (!user) {
      const signInMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: 'Please sign in to use the assistant.',
      };
      setCurrentChat((prev) => [...prev, signInMsg]);
      return;
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    const newMessages = [...currentChat, userMsg];
    setCurrentChat(newMessages);
    setInput('');
    setIsTyping(true);
    setSessionNotice('');

    if (isSendInvitePrompt(text)) {
      if (!selectedEvent) {
        const withReply = [
          ...newMessages,
          {
            id: `bot-${Date.now()}`,
            role: 'assistant' as const,
            content: 'Choose an event first, then I can send invite emails for it from this chat.',
          },
        ];
        setCurrentChat(withReply);
        setIsTyping(false);
        return;
      }

      const confirmationMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: `I’m ready to send the saved invite and email draft for ${selectedEvent.title}. I’ll only send after you confirm below.`,
        action: {
          type: 'confirmSendInvites',
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          status: 'pending',
        },
      };
      const withReply = [...newMessages, confirmationMessage];
      setCurrentChat(withReply);
      setIsTyping(false);
      const newChatId = activeChatId || `chat-${Date.now()}`;
      if (!activeChatId) setActiveChatId(newChatId);
      setChatHistory((prev) => {
        const rest = prev.filter((session) => session.id !== newChatId);
        const existing = prev.find((session) => session.id === newChatId);
        return [
          ...rest,
          {
            id: newChatId,
            title: getChatTitle(withReply),
            messages: withReply,
            createdAt: Date.now(),
            conversationId: existing?.conversationId ?? null,
          },
        ];
      });
      return;
    }

    const conversationId = activeChatId
      ? (chatHistory.find((session) => session.id === activeChatId)?.conversationId ?? null)
      : null;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    try {
      const idToken = await user.getIdToken();
      headers.Authorization = `Bearer ${idToken}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, conversationId }),
      });

      const data = await res.json();

      if (!res.ok) {
        const withReply = [
          ...newMessages,
          {
            id: `bot-${Date.now()}`,
            role: 'assistant' as const,
            content: data?.error ?? `Request failed (${res.status}). Please try again.`,
          },
        ];
        setCurrentChat(withReply);
        setIsTyping(false);
        const newChatId = activeChatId || `chat-${Date.now()}`;
        if (!activeChatId) setActiveChatId(newChatId);
        setChatHistory((prev) => {
          const rest = prev.filter((session) => session.id !== newChatId);
          const existing = prev.find((session) => session.id === newChatId);
          return [
            ...rest,
            {
              id: newChatId,
              title: getChatTitle(withReply),
              messages: withReply,
              createdAt: Date.now(),
              conversationId: existing?.conversationId ?? null,
            },
          ];
        });
        return;
      }

      const responseType = data?.type === 'image' ? 'image' : 'text';
      const content =
        responseType === 'text' && typeof data?.data === 'string'
          ? data.data
          : typeof data?.content === 'string'
            ? data.content
            : "Sorry, I couldn't process that.";
      const imageUrl =
        responseType === 'image'
          ? (typeof data?.data === 'string' ? data.data : undefined) ||
            (typeof (data as { image_url?: string })?.image_url === 'string'
              ? (data as { image_url: string }).image_url
              : undefined)
          : undefined;
      const imageBase64 =
        typeof data?.imageBase64 === 'string'
          ? data.imageBase64
          : responseType === 'image' && typeof data?.data === 'string' && !data.data.startsWith('http')
            ? data.data
            : undefined;
      const conversationIdFromBackend = data?.conversationId != null ? String(data.conversationId) : undefined;
      const assistantMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: responseType === 'image' ? '[Generated image]' : content,
        ...(imageUrl ? { imageUrl } : {}),
        ...(imageBase64 ? { imageBase64 } : {}),
      };
      const withReply = [...newMessages, assistantMsg];
      setCurrentChat(withReply);
      setIsTyping(false);
      const newChatId = activeChatId || conversationIdFromBackend || `chat-${Date.now()}`;
      if (!activeChatId) setActiveChatId(newChatId);
      setChatHistory((prev) => {
        const rest = prev.filter((session) => session.id !== newChatId);
        const existing = prev.find((session) => session.id === newChatId);
        const updatedSession = {
          id: newChatId,
          title: getChatTitle(withReply),
          messages: withReply,
          createdAt: Date.now(),
          conversationId: conversationIdFromBackend ?? existing?.conversationId ?? null,
        };
        const updated = [...rest, updatedSession];
        if (conversationIdFromBackend && !existing) {
          setTimeout(() => loadSessions(), 500);
        }
        return updated;
      });
      void linkActiveConversationToSelectedEvent(conversationIdFromBackend ?? conversationId);
    } catch {
      const withReply = [
        ...newMessages,
        {
          id: `bot-${Date.now()}`,
          role: 'assistant' as const,
          content: 'Something went wrong. Please check your connection and try again.',
        },
      ];
      setCurrentChat(withReply);
      setIsTyping(false);
      const newChatId = activeChatId || `chat-${Date.now()}`;
      if (!activeChatId) setActiveChatId(newChatId);
      setChatHistory((prev) => {
        const rest = prev.filter((session) => session.id !== newChatId);
        const existing = prev.find((session) => session.id === newChatId);
        return [
          ...rest,
          {
            id: newChatId,
            title: getChatTitle(withReply),
            messages: withReply,
            createdAt: Date.now(),
            conversationId: existing?.conversationId ?? null,
          },
        ];
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const startNewChat = () => {
    const hasContent =
      currentChat.length > 1 || (currentChat.length === 1 && currentChat[0].role === 'user');
    const alreadyInHistory =
      activeChatId != null && chatHistory.some((session) => session.id === activeChatId);

    if (hasContent && currentChat.some((message) => message.role === 'user') && !alreadyInHistory) {
      setChatHistory((prev) => {
        const existing = prev.find((session) => session.id === activeChatId);
        return [
          ...prev,
          {
            id: `chat-${Date.now()}`,
            title: getChatTitle(currentChat),
            messages: [...currentChat],
            createdAt: Date.now(),
            conversationId: existing?.conversationId ?? null,
          },
        ];
      });
    }

    setCurrentChat([WELCOME_MESSAGE]);
    setActiveChatId(null);
  };

  const deleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const session = chatHistory.find((chatSession) => chatSession.id === sessionId);
    const isBackendSession = session?.conversationId != null;

    const removeFromState = () => {
      setChatHistory((prev) => prev.filter((chatSession) => chatSession.id !== sessionId));
      if (activeChatId === sessionId) {
        setCurrentChat([WELCOME_MESSAGE]);
        setActiveChatId(null);
      }
    };

    if (!isBackendSession) {
      removeFromState();
      return;
    }

    if (!user) return;

    removeFromState();
    setSessionNotice('');

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/sessions/${session!.conversationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        if (res.status === 404) {
          return;
        }
        const err = await res.json().catch(() => ({}));
        console.error('Delete failed:', err?.error || res.status);
        setSessionNotice('That chat was removed here, but the server did not confirm deletion.');
        return;
      }
    } catch (err) {
      console.error('Delete failed:', err);
      setSessionNotice('That chat was removed locally. We could not confirm the server delete.');
    }
  };

  const openHistoryChat = async (session: ChatSession) => {
    setActiveChatId(session.id);
    if (session.messages.length > 0) {
      setCurrentChat(session.messages);
      return;
    }

    if (session.conversationId) {
      const messages = await loadConversationMessages(session.conversationId);
      if (messages) {
        setCurrentChat(messages);
        setChatHistory((prev) =>
          prev.map((chatSession) => (chatSession.id === session.id ? { ...chatSession, messages } : chatSession))
        );
      }
    }
  };

  const goHome = () => {
    if (asPage) {
      router.push('/');
    } else {
      setShowChatModal(false);
    }
  };

  const getImageDataUrl = (imageBase64: string) =>
    imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;

  const normalizeImageSource = (imageUrlOrBase64: string) => {
    if (imageUrlOrBase64.startsWith('data:')) return imageUrlOrBase64;
    if (imageUrlOrBase64.startsWith('/')) return imageUrlOrBase64;
    if (imageUrlOrBase64.startsWith('http')) {
      return `/api/image?url=${encodeURIComponent(imageUrlOrBase64)}`;
    }
    return getImageDataUrl(imageUrlOrBase64);
  };

  const openImageActions = (imageUrlOrBase64: string) => {
    setActionImage(normalizeImageSource(imageUrlOrBase64));
  };

  const closeImageActions = () => setActionImage(null);

  const openInviteEditor = () => {
    if (!actionImage) return;
    setEditorImage(actionImage);
    setActionImage(null);
  };

  const openSaveTemplateToEvent = () => {
    if (!actionImage) return;
    setPendingEventSave({ type: 'template', imageSrc: actionImage });
    setActionImage(null);
  };

  const openSaveEmailToEvent = (message: Message) => {
    setPendingEventSave({
      type: 'emailDraft',
      content: sanitizeEmailDraft(message.content),
      messageId: message.id,
    });
  };

  const handleSaveInviteToEvent = (imageDataUrl: string) => {
    setPendingEventSave({ type: 'finalInvite', imageSrc: imageDataUrl });
  };

  const confirmSaveToEvent = async () => {
    if (!pendingEventSave || !selectedEventId || !user) return;

    const activeConversationId =
      chatHistory.find((session) => session.id === activeChatId)?.conversationId ?? activeChatId ?? null;

    try {
      const idToken = await user.getIdToken();
      if (pendingEventSave.type === 'emailDraft') {
        await saveEmailDraftToEvent(selectedEventId, idToken, {
          content: pendingEventSave.content,
          updatedAt: new Date().toISOString(),
          sourceConversationId: activeConversationId,
          sourceMessageId: pendingEventSave.messageId,
        });
        if (activeConversationId) {
          await linkChatToEvent(selectedEventId, idToken, {
            conversationId: activeConversationId,
            title: getChatTitle(currentChat),
            updatedAt: new Date().toISOString(),
          });
        }
        setSessionNotice('Email draft saved to the selected event.');
      } else {
        await saveInviteAssetToEvent(selectedEventId, idToken, {
          src: pendingEventSave.imageSrc,
          updatedAt: new Date().toISOString(),
          sourceConversationId: activeConversationId,
          variant: pendingEventSave.type === 'template' ? 'template' : 'final',
        });
        if (activeConversationId) {
          await linkChatToEvent(selectedEventId, idToken, {
            conversationId: activeConversationId,
            title: getChatTitle(currentChat),
            updatedAt: new Date().toISOString(),
          });
        }
        setSessionNotice(
          pendingEventSave.type === 'template'
            ? 'Template saved to the selected event.'
            : 'Final invite saved to the selected event.'
        );
      }
      setPendingEventSave(null);
    } catch (err) {
      console.error('Failed to save to event:', err);
      setSessionNotice(err instanceof Error ? err.message : 'We could not save that asset to the selected event.');
    }
  };

  const saveImage = (dataUrl: string) => {
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `invite-design-${Date.now()}.png`;
    anchor.click();
  };

  if (!asPage && !showChatModal) return null;

  return (
    <>
      {!asPage && (
        <div
          className="fixed inset-0 z-40 transition-opacity"
          style={{ backgroundColor: 'rgba(45, 24, 16, 0.2)' }}
          aria-hidden
        />
      )}

      <div
        className={`w-full flex ${asPage ? 'h-screen overflow-hidden' : 'fixed inset-y-0 left-0 z-50 shadow-2xl transition-transform duration-300 ease-out'}`}
        style={asPage ? undefined : { transform: hasSlidIn ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div
          className="relative flex min-h-full w-full flex-col overflow-hidden border-r lg:w-[78%]"
          style={{ borderColor: '#e5e4e2', backgroundColor: '#f8f9fa' }}
        >
          <ChatPanelPoppers />
          <div
            className="relative z-10 flex flex-shrink-0 items-center justify-between border-b p-4"
            style={{ borderColor: '#e5e4e2', backgroundColor: 'rgba(248, 249, 250, 0.9)' }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a56]">
                AI Invite Studio
              </p>
              <h3 className="mt-1 text-lg font-semibold text-black">Create, tweak, and save invitation concepts</h3>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="hidden rounded-full bg-[#f3ebdf] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b] sm:block">
                Demo image fallback enabled
              </div>
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
            <div className="flex-shrink-0 rounded-[20px] border border-[#ece2d7] bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a56]">Current event</p>
                  {selectedEvent ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#2d1810]">{selectedEvent.title}</span>
                      <span className="rounded-full bg-[#f5ecdf] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#855d3b]">
                        {selectedEvent.status || 'draft'}
                      </span>
                      <span className="text-xs text-[#8a6d54]">
                        RSVP {formatEventMeta(selectedEvent.rsvpDeadline)}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#6b5b4f]">Choose an event to save generated assets into one workspace.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {events.length > 0 ? (
                    <select
                      value={selectedEventId ?? ''}
                      onChange={(event) => setSelectedEventId(event.target.value || null)}
                      className="rounded-full border border-[#ddd1c2] bg-[#fffaf4] px-4 py-2 text-sm font-medium text-[#2d1810] outline-none focus:border-[#d2b48c]"
                    >
                      <option value="">Select an event</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push('/events')}
                      className="rounded-full border border-[#ddd1c2] bg-[#fffaf4] px-4 py-2 text-sm font-medium text-[#2d1810] transition hover:bg-[#f7efe4]"
                    >
                      Create event
                    </button>
                  )}
                  {selectedEvent && (
                    <button
                      type="button"
                      onClick={() => router.push(`/events/${selectedEvent.id}`)}
                      className="rounded-full bg-[#2d1810] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#4a2e1d]"
                    >
                      Open event
                    </button>
                  )}
                </div>
              </div>
            </div>

            {sessionNotice && (
              <div className="mt-3 flex-shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {sessionNotice}
              </div>
            )}

            <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-[28px] border border-[#e8ddd1] bg-white px-4 py-4 shadow-sm">
            <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            {currentChat.map((message) =>
              message.role === 'user' ? (
                <div key={message.id} className="mb-4 flex items-center justify-end space-x-3">
                  <div
                    className="max-w-[85%] rounded-[22px] px-4 py-3 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #e5e4e2 0%, #d2b48c 100%)' }}
                  >
                    <p className="text-sm text-black">{message.content}</p>
                  </div>
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'linear-gradient(135deg, #d2b48c 0%, #e5e4e2 100%)' }}
                  >
                    <span className="text-sm font-semibold text-black">Y</span>
                  </div>
                </div>
              ) : (
                <div key={message.id} className="mb-4 flex items-start space-x-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'linear-gradient(135deg, #d2b48c 0%, #e5e4e2 100%)' }}
                  >
                    <span className="text-sm font-semibold text-black">L</span>
                  </div>
                  <div
                    className={`max-w-[90%] space-y-3 rounded-[24px] border px-4 py-4 shadow-sm ${
                      message.imageUrl || message.imageBase64
                        ? 'border-[#e6d7c6] bg-[#fff9f1]'
                        : 'border-[#e6ddd2] bg-[#f7f2eb]'
                    }`}
                  >
                    {(message.imageUrl || message.imageBase64) ? (
                      <div className="space-y-3">
                        <ImageMessage
                          imageUrl={message.imageUrl}
                          imageBase64={message.imageBase64}
                          getImageDataUrl={getImageDataUrl}
                          onOpenActions={openImageActions}
                        />
                        <div className="rounded-[18px] bg-white px-4 py-3">
                          <p className="text-sm font-semibold text-[#2d1810]">What you can do next</p>
                          <p className="mt-1 text-sm leading-6 text-[#6b5b4f]">
                            Download the raw template, open the invite editor, or save it into the current event workspace.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openImageActions(message.imageUrl || message.imageBase64!)}
                            className="rounded-full bg-[#2d1810] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#4a2e1d]"
                          >
                            Open asset actions
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {message.content && <p className="text-sm leading-7 text-black">{message.content}</p>}
                      </>
                    )}
                    {!message.imageUrl &&
                      !message.imageBase64 &&
                      message.id !== 'welcome' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.action?.type === 'confirmSendInvites' && (
                            <>
                              <button
                                type="button"
                                onClick={() => runSendInvitesFromChat(message.id, message.action!.eventId)}
                                disabled={message.action.status === 'running' || message.action.status === 'done'}
                                className="rounded-full bg-[#2d1810] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#4a2e1d] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {message.action.status === 'running'
                                  ? 'Sending now...'
                                  : message.action.status === 'done'
                                    ? 'Invites sent'
                                    : 'Send invites now'}
                              </button>
                              <span className="rounded-full border border-[#ddd1c2] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5c4330]">
                                {message.action.eventTitle}
                              </span>
                              {message.action.resultSummary && (
                                <p className="w-full text-sm text-[#6b5b4f]">{message.action.resultSummary}</p>
                              )}
                            </>
                          )}
                          {!message.action && (
                            <>
                              <button
                                type="button"
                                onClick={() => openSaveEmailToEvent(message)}
                                className="rounded-full bg-[#2d1810] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#4a2e1d]"
                              >
                                Save email to event
                              </button>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(message.content)}
                                className="rounded-full border border-[#ddd1c2] px-3 py-1.5 text-[11px] font-semibold text-[#5c4330] transition hover:bg-[#f7efe4]"
                              >
                                Copy text
                              </button>
                              <button
                                type="button"
                                title="Save this text to the selected event as outgoing email copy, or copy it directly."
                                aria-label="How to use this draft"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#ddd1c2] bg-white text-xs font-semibold text-[#7a5c42] transition hover:bg-[#f7efe4]"
                              >
                                i
                              </button>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )
            )}

            {isTyping && (
              <div className="flex items-center space-x-3">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'linear-gradient(135deg, #d2b48c 0%, #e5e4e2 100%)' }}
                >
                  <span className="text-sm font-semibold text-black">AI</span>
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#e5e4e2' }}>
                  <div className="flex gap-1">
                    <span
                      className="h-2 w-2 rounded-full animate-bounce"
                      style={{ backgroundColor: '#d2b48c', animationDelay: '0ms' }}
                    />
                    <span
                      className="h-2 w-2 rounded-full animate-bounce"
                      style={{ backgroundColor: '#d2b48c', animationDelay: '150ms' }}
                    />
                    <span
                      className="h-2 w-2 rounded-full animate-bounce"
                      style={{ backgroundColor: '#d2b48c', animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
            </div>
            </div>
          </div>

          <div
            className="relative z-10 flex-shrink-0 border-t px-4 pb-4 pt-3"
            style={{ borderColor: '#e5e4e2', backgroundColor: 'rgba(248, 249, 250, 0.95)' }}
          >
            {!user && (
              <p className="mb-2 text-sm" style={{ color: '#6b5b4f' }}>
                Sign in to use the assistant.
              </p>
            )}
            <div className="rounded-[22px] border border-[#ddd1c2] bg-white p-2 shadow-sm">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={user ? 'Describe your event, draft copy, or ask for an invite style...' : 'Sign in to use the assistant'}
                  disabled={!user}
                  className="flex-1 rounded-xl px-4 py-3 text-black placeholder-gray-500 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ borderWidth: '1px', borderColor: '#e5e4e2', backgroundColor: '#fff' }}
                  onFocus={(event) => {
                    if (user) {
                      event.target.style.borderColor = '#d2b48c';
                      event.target.style.boxShadow = '0 0 0 2px rgba(210, 180, 140, 0.3)';
                    }
                  }}
                  onBlur={(event) => {
                    event.target.style.borderColor = '#e5e4e2';
                    event.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!user || !input.trim()}
                  className="rounded-xl px-5 py-3 font-semibold shadow transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #e5e4e2 0%, #d2b48c 100%)', color: '#000' }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="hidden min-w-[280px] w-[22%] flex-col border-l lg:flex"
          style={{ backgroundColor: '#e5e4e2', borderColor: '#d3d3d3' }}
        >
          <div className="flex-shrink-0 border-b p-4" style={{ borderColor: '#d3d3d3' }}>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={goHome}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#d9cec1] bg-white px-4 py-3 text-sm font-semibold text-[#4f3422] shadow-sm transition hover:bg-[#fffaf4]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Home
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-shrink-0 p-3 space-y-3">
              <div className="rounded-2xl border border-[#d9cec1] bg-[#f6efe4] px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">Quick status</p>
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl bg-white px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56]">Image result</p>
                    <p className="mt-1 text-sm font-semibold text-[#2d1810]">
                      {latestGeneratedImage ? 'Ready for actions' : 'No image yet'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7a56]">Text draft</p>
                    <p className="mt-1 text-sm font-semibold text-[#2d1810]">
                      {latestTextResult ? 'Ready to save' : 'No draft yet'}
                    </p>
                  </div>
                  {selectedEvent ? (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push(`/events/${selectedEvent.id}`)}
                        className="w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-[#4f3422] transition hover:bg-[#fffaf4]"
                      >
                        Open event workspace
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push('/events')}
                      className="w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-[#4f3422] transition hover:bg-[#fffaf4]"
                    >
                      Choose an event
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={startNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#e5e4e2]"
                style={{ backgroundColor: '#f8f9fa', borderWidth: '1px', borderColor: '#d3d3d3' }}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New chat
              </button>
            </div>

            <div className="flex-shrink-0 px-3 pb-2">
              <div className="rounded-2xl border border-[#d9cec1] bg-[#f6efe4] px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#855d3b]">History</p>
                <div className="mt-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-black">Saved chats</h4>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#6b5b4f]">
                    {chatHistory.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2">
              {chatHistory.length === 0 ? (
                <p className="px-2 py-4 text-sm" style={{ color: '#6b5b4f' }}>
                  No chats yet. Start a conversation and it will appear here.
                </p>
              ) : (
                [...chatHistory]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((session) => (
                    <div
                      key={session.id}
                      className="group flex items-center gap-1 rounded-lg text-sm transition-colors"
                      style={
                        activeChatId === session.id
                          ? { backgroundColor: '#d2b48c', color: '#000' }
                          : { color: '#2d1810' }
                      }
                    >
                      <button
                        type="button"
                        onClick={() => openHistoryChat(session)}
                        className="min-w-0 flex-1 truncate rounded-lg px-3 py-2.5 text-left font-medium"
                        onMouseEnter={(event) => {
                          if (activeChatId !== session.id) {
                            event.currentTarget.parentElement!.style.backgroundColor = 'rgba(210, 180, 140, 0.4)';
                          }
                        }}
                        onMouseLeave={(event) => {
                          if (activeChatId !== session.id) {
                            event.currentTarget.parentElement!.style.backgroundColor = 'transparent';
                          }
                        }}
                        title={session.title}
                      >
                        <span className="block truncate">{session.title}</span>
                        <span className="mt-0.5 block text-xs opacity-80" style={{ fontWeight: 400 }}>
                          {formatSessionDate(session.createdAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => deleteSession(session.id, event)}
                        className="flex-shrink-0 rounded p-1.5 opacity-70 transition-opacity hover:bg-black/10 hover:opacity-100"
                        title="Delete chat"
                        aria-label="Delete chat"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {actionImage && (
        <ImageActionModal
          imageSrc={actionImage}
          onClose={closeImageActions}
          onDownloadTemplate={() => saveImage(actionImage)}
          onCreateInvite={openInviteEditor}
          onSaveToEvent={openSaveTemplateToEvent}
        />
      )}

      {editorImage && (
        <InviteEditorModal
          backgroundSrc={editorImage}
          onClose={() => setEditorImage(null)}
          onSaveToEvent={handleSaveInviteToEvent}
        />
      )}

      {pendingEventSave && (
        <SaveToEventModal
          title={
            pendingEventSave.type === 'emailDraft'
              ? 'Attach this email draft'
              : pendingEventSave.type === 'finalInvite'
                ? 'Attach this finished invite'
                : 'Attach this invite template'
          }
          description={
            pendingEventSave.type === 'emailDraft'
              ? 'This stores the AI-written email copy under the event so it can become your send-ready message later.'
              : 'This stores the current invite asset under the event so you have one place for the image and outgoing copy.'
          }
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
          onClose={() => setPendingEventSave(null)}
          onConfirm={confirmSaveToEvent}
        />
      )}
    </>
  );
}
