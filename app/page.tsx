'use client';

import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { ChatMessage } from '@/types/chat';

const DEFAULT_INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Hey! How are you doing? I had a great day today, tell me what are you up to? 💕',
  time: '05:18 PM',
};

const STORAGE_KEY = 'ananya_chat_messages';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const savedTheme =
      (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    try {
      const savedChat = localStorage.getItem(STORAGE_KEY);
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load chat history from localStorage', e);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      const validMessages = messages.filter((m) => !m.isError);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validMessages));
    } catch (e) {
      console.error('Failed to save chat history to localStorage', e);
    }
  }, [messages, isMounted]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleConfirmClearChat = () => {
    setMessages([DEFAULT_INITIAL_MESSAGE]);
    localStorage.removeItem(STORAGE_KEY);
    setShowClearModal(false);
  };

  const showToastNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToastNotification('Please select an image file only.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToastNotification('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognition.start();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imagePreview) || loading) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      role: 'user',
      content: input.trim() || '📸 [Sent an image]',
      time: currentTime,
      ...(imagePreview ? { image: imagePreview } : {}),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setImagePreview(null);
    setLoading(true);

    const payloadMessages = updatedMessages.filter((msg) => !msg.isError);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages, stream: true }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let rawError = String(errorData.error || '');
        if (
          res.status === 429 ||
          rawError.includes("429") ||
          rawError.includes("RESOURCE_EXHAUSTED") ||
          rawError.toLowerCase().includes("quota") ||
          rawError.toLowerCase().includes("rate limit") ||
          rawError.toLowerCase().includes("daily limit")
        ) {
          throw new Error("Daily limit finished. Please try again later.");
        }
        throw new Error(rawError || 'Something went wrong while getting response.');
      }

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantReply = '';
        const assistantTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '', time: assistantTime },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantReply += chunk;

          setMessages((prev) => {
            const next = [...prev];
            const lastIndex = next.length - 1;
            if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
              next[lastIndex] = {
                ...next[lastIndex],
                content: assistantReply,
              };
            }
            return next;
          });
        }
      }
    } catch (error: any) {
      let displayMessage = error?.message || 'Oops, something went wrong. Could you please try again? 🥺';
      if (
        displayMessage.includes("429") ||
        displayMessage.includes("RESOURCE_EXHAUSTED") ||
        displayMessage.toLowerCase().includes("quota") ||
        displayMessage.toLowerCase().includes("rate limit") ||
        displayMessage.toLowerCase().includes("daily limit") ||
        displayMessage.startsWith("{")
      ) {
        displayMessage = "Daily limit finished. Please try again later.";
      }

      setMessages((prev) => {
        const filtered = prev.filter((m) => !(m.role === 'assistant' && m.content === ''));
        return [
          ...filtered,
          {
            role: 'assistant',
            content: displayMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isError: true,
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-info">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
            alt="Ananya Sharma"
            className="avatar"
          />
          <div>
            <div className="user-name">Ananya Sharma 🌸</div>
            <div className="user-status">
              {loading ? 'typing...' : 'online'}
            </div>
          </div>
        </div>
        <div className="header-actions">
          {isMounted && (
            <>
              <button
                onClick={() => setShowClearModal(true)}
                className="action-btn"
                title="Clear Chat History"
                aria-label="Clear chat history"
              >
                🗑️
              </button>
              <button
                onClick={toggleTheme}
                className="action-btn"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </>
          )}
        </div>
      </header>

      <main className="chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message-row ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            <div
              className={`message-bubble ${
                msg.role === 'user' ? 'user' : 'assistant'
              }`}
            >
              {msg.image && (
                <img src={msg.image} alt="User attachment" className="message-image" />
              )}
              <div>{msg.content}</div>
              {isMounted && (
                <div className="message-time" suppressHydrationWarning>
                  {msg.time || '12:00 PM'}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="message-row assistant">
            <div className="typing-indicator">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {notification && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: '13px',
            textAlign: 'center',
          }}
        >
          {notification}
        </div>
      )}

      {imagePreview && (
        <div className="image-preview-container">
          <img src={imagePreview} alt="Preview" className="image-preview-thumbnail" />
          <span style={{ fontSize: '12px', flex: 1 }}>Image attached</span>
          <button
            type="button"
            className="remove-image-btn"
            onClick={() => setImagePreview(null)}
          >
            ✕
          </button>
        </div>
      )}

      <footer className="chat-footer">
        <form onSubmit={handleSubmit} className="chat-footer-form">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="action-btn"
            style={{ color: 'var(--input-text)' }}
            onClick={() => fileInputRef.current?.click()}
            title="Attach Image"
          >
            📎
          </button>

          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <button
            type="button"
            className={`action-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleVoiceInput}
            title={isListening ? 'Listening...' : 'Voice Dictation'}
          >
            🎤
          </button>

          <button
            type="submit"
            className="send-button"
            disabled={(!input.trim() && !imagePreview) || loading}
          >
            ➤
          </button>
        </form>
      </footer>

      {/* Animated Confirmation Popup Modal */}
      {showClearModal && (
        <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <div className="modal-title">Clear Chat History?</div>
            <div className="modal-description">
              Are you sure you want to clear all chat messages? This action cannot be undone.
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowClearModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-danger"
                onClick={handleConfirmClearChat}
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
