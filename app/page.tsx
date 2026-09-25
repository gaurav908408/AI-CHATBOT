'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { ChatMessage } from '@/types/chat';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hey! Kaisa hai tu? Aaj mera din kafi accha tha, bol tu kya kar raha hai? 💕',
      time: '05:18 PM',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { role: 'user', content: input.trim(), time: currentTime };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Arey, thoda issue ho gaya. Phir se try karega please? 🥺',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Internet ya server problem lag raha hai. Ek baar check karle na! 💕',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-info">
          <div className="avatar">💖</div>
          <div>
            <div className="user-name">Ananya Sharma 🌸</div>
            <div className="user-status">
              {loading ? 'typing...' : 'online'}
            </div>
          </div>
        </div>
        <div className="header-actions">
          {isMounted && (
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          )}
          <span>📞</span>
          <span>📹</span>
          <span>⋮</span>
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
              <div>{msg.content}</div>
              {isMounted && (
                <div className="message-time" suppressHydrationWarning>
                  {msg.time || '12:00 PM'}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
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

      <footer className="chat-footer">
        <form onSubmit={handleSubmit} style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!input.trim() || loading}
          >
            ➤
          </button>
        </form>
      </footer>
    </div>
  );
}
