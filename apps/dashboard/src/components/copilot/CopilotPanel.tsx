import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';

/**
 * Floating LLM Safety Copilot panel.
 *
 * Self-contained: holds its own chat state, talks directly to the backend
 * `POST /api/copilot/chat`. Does not touch the shared event-store, so it
 * never conflicts with the live-ops dashboard.
 *
 * Backend URL: VITE_BACKEND_URL (e.g. https://suraksha-backend.onrender.com),
 * falls back to localhost:8000 for local dev.
 */

const API_BASE =
  (import.meta as any).env?.VITE_BACKEND_URL ?? 'http://localhost:8000';

const CYAN = '#00f3ff';
const PURPLE = '#b026ff';
const PANEL_BG = 'rgba(5, 7, 20, 0.97)';

interface ChatMessage {
  role: 'user' | 'copilot';
  text: string;
  provider?: string;
  citedEventIds?: string[];
}

const QUICK_QUESTIONS = [
  'What just happened on site?',
  'What is the riskiest zone right now?',
  'How many critical events this shift?',
];

export const CopilotPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'copilot',
      text: 'Safety Copilot online. Ask me about the current shift, zones, or recent risk events.',
      provider: 'system',
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    // Abort if the backend hangs so the panel never gets stuck in a loading state.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_BASE}/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: 'copilot',
          text: data.answer ?? '(no answer)',
          provider: data.provider,
          citedEventIds: data.citedEventIds ?? [],
        },
      ]);
    } catch (err: any) {
      const msg =
        err.name === 'AbortError'
          ? 'Copilot request timed out after 15s. Is the backend reachable?'
          : `Could not reach the Copilot backend (${err.message}). Check the FastAPI server is running and VITE_BACKEND_URL is set.`;
      setMessages((m) => [...m, { role: 'copilot', text: msg, provider: 'error' }]);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  // Floating launcher button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Open Safety Copilot"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 18px',
          borderRadius: 30,
          border: `1px solid ${CYAN}`,
          background: `linear-gradient(135deg, ${CYAN} 0%, ${PURPLE} 100%)`,
          color: '#030307',
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 900,
          fontSize: 12,
          letterSpacing: 1,
          cursor: 'pointer',
          boxShadow: '0 0 20px rgba(0,243,255,0.5)',
        }}
      >
        <Bot size={18} /> COPILOT
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 2000,
        width: 380,
        maxWidth: '92vw',
        height: 560,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        background: PANEL_BG,
        border: `1px solid ${CYAN}55`,
        borderRadius: 10,
        boxShadow: '0 10px 50px rgba(0,0,0,0.8), 0 0 30px rgba(0,243,255,0.15)',
        fontFamily: "'Orbitron', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: `1px solid ${CYAN}33`,
          background: 'rgba(0,243,255,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} style={{ color: CYAN }} />
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>
            SAFETY COPILOT
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
        {loading && (
          <div style={{ color: CYAN, fontSize: 11, fontFamily: "'Courier New', monospace", opacity: 0.8 }}>
            analyzing site data…
          </div>
        )}
      </div>

      {/* Quick questions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 12px 8px' }}>
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            disabled={loading}
            style={{
              fontSize: 9.5,
              color: CYAN,
              background: 'rgba(0,243,255,0.06)',
              border: `1px solid ${CYAN}33`,
              borderRadius: 12,
              padding: '4px 8px',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: "'Courier New', monospace",
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: `1px solid ${CYAN}22` }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the Safety Copilot…"
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${CYAN}33`,
            borderRadius: 6,
            padding: '8px 10px',
            color: '#fff',
            fontSize: 12,
            fontFamily: "'Courier New', monospace",
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: `linear-gradient(135deg, ${CYAN} 0%, ${PURPLE} 100%)`,
            border: 'none',
            borderRadius: 6,
            width: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#030307',
            cursor: loading ? 'default' : 'pointer',
          }}
          title="Send"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

const Bubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
      <div
        style={{
          background: isUser ? 'rgba(176,38,255,0.15)' : 'rgba(0,243,255,0.07)',
          border: `1px solid ${isUser ? PURPLE : CYAN}33`,
          borderRadius: 8,
          padding: '8px 10px',
          color: '#e8f6ff',
          fontSize: 12,
          lineHeight: 1.5,
          fontFamily: "'Courier New', monospace",
          whiteSpace: 'pre-wrap',
        }}
      >
        {msg.text}
      </div>
      {!isUser && (msg.provider || (msg.citedEventIds && msg.citedEventIds.length > 0)) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4, alignItems: 'center' }}>
          {msg.provider && msg.provider !== 'system' && (
            <span style={{ fontSize: 8.5, color: providerColor(msg.provider), letterSpacing: 0.5 }}>
              {providerLabel(msg.provider)}
            </span>
          )}
          {msg.citedEventIds?.map((id) => (
            <span
              key={id}
              style={{
                fontSize: 8.5,
                color: '#ffaa00',
                background: 'rgba(255,170,0,0.08)',
                border: '1px solid rgba(255,170,0,0.3)',
                borderRadius: 8,
                padding: '1px 5px',
                fontFamily: "'Courier New', monospace",
              }}
            >
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

function providerLabel(p: string): string {
  if (p.startsWith('groq')) return '⚡ Llama 3.3 70B';
  if (p === 'claude') return '◈ Claude';
  if (p === 'offline-rule-based') return '○ offline mode';
  if (p === 'error') return '✕ backend offline';
  return p;
}

function providerColor(p: string): string {
  if (p.startsWith('groq')) return '#00ff66';
  if (p === 'claude') return CYAN;
  if (p === 'error') return '#ff003c';
  return 'rgba(255,255,255,0.4)';
}
