'use client';

import { useState, useRef, useEffect } from 'react';
import { useModal } from './ModalContext';
import { useAuth } from '../lib/useAuth';
import ChatPanelPoppers from './ChatPanelPoppers';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** When set, assistant message shows this base64 image (e.g. from Azure image API). */
  imageBase64?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  /** From backend (Cosmos DB); null for new chat, then set from first response to resume. */
  conversationId?: string | null;
};

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your invitation assistant. Describe your event—type, theme, and preferences—and I'll help create designs for you.",
};

function getChatTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New chat';
  const text = firstUser.content.trim();
  return text.length > 28 ? text.slice(0, 28) + '…' : text;
}

export default function ChatbotModal() {
  const { showChatModal, setShowChatModal } = useModal();
  const user = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChat, setCurrentChat] = useState<Message[]>([WELCOME_MESSAGE]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasSlidIn, setHasSlidIn] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showChatModal) {
      setHasSlidIn(false);
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setHasSlidIn(true));
      });
      return () => cancelAnimationFrame(t);
    }
  }, [showChatModal]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat, isTyping]);

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

    const conversationId = activeChatId
      ? (chatHistory.find((s) => s.id === activeChatId)?.conversationId ?? null)
      : null;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const idToken = user ? await user.getIdToken() : null;
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
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
          const rest = prev.filter((c) => c.id !== newChatId);
          const existing = prev.find((c) => c.id === newChatId);
          return [...rest, { id: newChatId, title: getChatTitle(withReply), messages: withReply, createdAt: Date.now(), conversationId: existing?.conversationId ?? null }];
        });
        return;
      }

      const responseType = data?.type === 'image' ? 'image' : 'text';
      const content =
        responseType === 'text' && typeof data?.data === 'string'
          ? data.data
          : typeof data?.content === 'string'
            ? data.content
            : 'Sorry, I couldn’t process that.';
      const imageBase64 =
        responseType === 'image' && typeof data?.data === 'string'
          ? data.data
          : typeof data?.imageBase64 === 'string'
            ? data.imageBase64
            : undefined;
      const conversationIdFromBackend = data?.conversationId != null ? String(data.conversationId) : undefined;
      const assistantMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content,
        ...(imageBase64 ? { imageBase64 } : {}),
      };
      const withReply = [...newMessages, assistantMsg];
      setCurrentChat(withReply);
      setIsTyping(false);
      const newChatId = activeChatId || `chat-${Date.now()}`;
      if (!activeChatId) setActiveChatId(newChatId);
      setChatHistory((prev) => {
        const rest = prev.filter((c) => c.id !== newChatId);
        const existing = prev.find((c) => c.id === newChatId);
        return [...rest, { id: newChatId, title: getChatTitle(withReply), messages: withReply, createdAt: Date.now(), conversationId: conversationIdFromBackend ?? existing?.conversationId ?? null }];
      });
    } catch (err) {
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
        const rest = prev.filter((c) => c.id !== newChatId);
        const existing = prev.find((c) => c.id === newChatId);
        return [...rest, { id: newChatId, title: getChatTitle(withReply), messages: withReply, createdAt: Date.now(), conversationId: existing?.conversationId ?? null }];
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewChat = () => {
    const hasContent = currentChat.length > 1 || (currentChat.length === 1 && currentChat[0].role === 'user');
    if (hasContent && currentChat.some((m) => m.role === 'user')) {
      setChatHistory((prev) => {
        const existing = activeChatId ? prev.find((s) => s.id === activeChatId) : undefined;
        return [
          ...prev,
          { id: `chat-${Date.now()}`, title: getChatTitle(currentChat), messages: [...currentChat], createdAt: Date.now(), conversationId: existing?.conversationId ?? null },
        ];
      });
    }
    setCurrentChat([WELCOME_MESSAGE]);
    setActiveChatId(null);
  };

  const openHistoryChat = (session: ChatSession) => {
    setCurrentChat(session.messages);
    setActiveChatId(session.id);
  };

  const goHome = () => {
    setShowChatModal(false);
  };

  const getImageDataUrl = (imageBase64: string) =>
    imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;

  const openLightbox = (imageBase64: string) => {
    setLightboxImage(getImageDataUrl(imageBase64));
    setLightboxZoom(1);
  };

  const closeLightbox = () => setLightboxImage(null);

  const saveImage = (dataUrl: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `invite-design-${Date.now()}.png`;
    a.click();
  };

  if (!showChatModal) return null;

  return (
    <>
      {/* Backdrop - warm tint to match app */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ backgroundColor: 'rgba(45, 24, 16, 0.2)' }}
        aria-hidden
      />
      {/* Slide-in panel: 80% chat + 20% sidebar - app palette: #f8f9fa, #e5e4e2, #d2b48c, #d3d3d3 */}
      <div
        className="fixed inset-y-0 left-0 z-50 w-full flex shadow-2xl transition-transform duration-300 ease-out"
        style={{ transform: hasSlidIn ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {/* Left 80% - Chat area with twinkling bubbles like homepage */}
        <div
          className="w-[80%] flex flex-col min-h-full border-r relative overflow-hidden"
          style={{ borderColor: '#e5e4e2', backgroundColor: '#f8f9fa' }}
        >
          <ChatPanelPoppers />
          <div className="flex items-center justify-between p-4 flex-shrink-0 border-b relative z-10" style={{ borderColor: '#e5e4e2', backgroundColor: 'rgba(248, 249, 250, 0.9)' }}>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d2b48c' }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e5e4e2' }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d3d3d3' }} />
            </div>
            <h3 className="text-lg font-semibold text-black">AI Invitation Assistant</h3>
            <div className="w-10" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 relative z-10">
            {currentChat.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex items-center space-x-3 justify-end">
                  <div
                    className="rounded-2xl px-4 py-3 max-w-[85%]"
                    style={{ background: 'linear-gradient(135deg, #e5e4e2 0%, #d2b48c 100%)' }}
                  >
                    <p className="text-black text-sm">{msg.content}</p>
                  </div>
                  <div
                    className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #d2b48c 0%, #e5e4e2 100%)' }}
                  >
                    <span className="text-black text-lg">✨</span>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #d2b48c 0%, #e5e4e2 100%)' }}
                  >
                    <span className="text-black text-lg">🤖</span>
                  </div>
                  <div className="rounded-2xl px-4 py-3 max-w-[85%] space-y-2" style={{ backgroundColor: '#e5e4e2' }}>
                    {msg.imageBase64 && (
                      <button
                        type="button"
                        onClick={() => openLightbox(msg.imageBase64!)}
                        className="block rounded-lg overflow-hidden max-w-full max-h-64 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#d2b48c]"
                        title="Click to zoom and save"
                      >
                        <img
                          src={getImageDataUrl(msg.imageBase64)}
                          alt="Generated design"
                          className="rounded-lg max-w-full h-auto max-h-64 object-contain cursor-pointer hover:opacity-95"
                        />
                      </button>
                    )}
                    <p className="text-black text-sm">{msg.content}</p>
                  </div>
                </div>
              )
            )}
            {isTyping && (
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #d2b48c 0%, #e5e4e2 100%)' }}
                >
                  <span className="text-black text-lg">🤖</span>
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#e5e4e2' }}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#d2b48c', animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#d2b48c', animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#d2b48c', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 flex-shrink-0 border-t relative z-10" style={{ borderColor: '#e5e4e2', backgroundColor: 'rgba(248, 249, 250, 0.9)' }}>
            {!user && (
              <p className="text-sm mb-2" style={{ color: '#6b5b4f' }}>
                Sign in to use the assistant.
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={user ? 'Describe your event...' : 'Sign in to use the assistant'}
                disabled={!user}
                className="flex-1 px-4 py-3 rounded-xl text-black placeholder-gray-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderWidth: '1px', borderColor: '#e5e4e2', backgroundColor: '#fff' }}
                onFocus={(e) => {
                  if (user) {
                    e.target.style.borderColor = '#d2b48c';
                    e.target.style.boxShadow = '0 0 0 2px rgba(210, 180, 140, 0.3)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e4e2';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!user || !input.trim()}
                className="px-5 py-3 font-semibold rounded-xl transition-all duration-200 shadow hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
                style={{ background: 'linear-gradient(135deg, #e5e4e2 0%, #d2b48c 100%)', color: '#000' }}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right 20% - Sidebar: chat history + Home */}
        <div
          className="w-[20%] min-w-[200px] flex flex-col border-l"
          style={{ backgroundColor: '#e5e4e2', borderColor: '#d3d3d3' }}
        >
          <div className="p-4 flex-shrink-0 border-b" style={{ borderColor: '#d3d3d3' }}>
            <button
              type="button"
              onClick={goHome}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-xl transition-all duration-200 shadow text-black hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #e5e4e2 0%, #d2b48c 100%)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="p-3 flex-shrink-0">
              <button
                type="button"
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-black hover:bg-[#e5e4e2]"
                style={{ backgroundColor: '#f8f9fa', borderWidth: '1px', borderColor: '#d3d3d3' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New chat
              </button>
            </div>
            <div className="px-3 pb-2 flex-shrink-0">
              <h4 className="text-sm font-semibold text-black">Chat history</h4>
            </div>
            <div className="flex-1 overflow-y-auto px-2 space-y-1 min-h-0">
              {chatHistory.length === 0 ? (
                <p className="text-sm px-2 py-4" style={{ color: '#6b5b4f' }}>No chats yet. Start a conversation and it will appear here.</p>
              ) : (
                [...chatHistory]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => openHistoryChat(session)}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors truncate block"
                      style={
                        activeChatId === session.id
                          ? { backgroundColor: '#d2b48c', color: '#000', fontWeight: 600 }
                          : { color: '#2d1810' }
                      }
                      onMouseEnter={(e) => {
                        if (activeChatId !== session.id) {
                          e.currentTarget.style.backgroundColor = 'rgba(210, 180, 140, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeChatId !== session.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                      title={session.title}
                    >
                      {session.title}
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image lightbox: zoom and save */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="flex-shrink-0 flex items-center justify-between gap-4 p-3 bg-black/50">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-white text-sm min-w-[3rem] text-center">{Math.round(lightboxZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.min(3, z + 0.25))}
                className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => saveImage(lightboxImage)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-black bg-[#d2b48c] hover:bg-[#c4a67a] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Save image
              </button>
              <button
                type="button"
                onClick={closeLightbox}
                className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                title="Close"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && closeLightbox()}
          >
            <img
              src={lightboxImage}
              alt="Generated design"
              className="max-w-full max-h-full object-contain transition-transform origin-center"
              style={{ transform: `scale(${lightboxZoom})` }}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
