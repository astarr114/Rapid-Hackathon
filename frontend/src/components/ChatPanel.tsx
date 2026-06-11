import { FormEvent, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { ToolTraceEntry } from '../lib/types';
import { AgentToolTrace } from './AgentToolTrace';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  toolTrace?: ToolTraceEntry[];
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Ask me to scan for data reliability issues, connector failures, or incident trends.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const data = await api<{
        reply: string;
        sessionId?: string;
        toolTrace?: ToolTraceEntry[];
      }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, sessionId }),
      });
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply, toolTrace: data.toolTrace },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reach agent';
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  return (
    <div className="card chat-panel">
      <h2 className="card__title">SRE Agent</h2>
      <p className="chat-panel__subtitle">Powered by Gemini Agent Builder · Tool trace enabled</p>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`chat-bubble chat-bubble--${msg.role}`}>
              <span className="chat-bubble__role">{msg.role === 'user' ? 'You' : 'Agent'}</span>
              <p className="chat-bubble__text">{msg.text}</p>
            </div>
            {msg.toolTrace && msg.toolTrace.length > 0 && (
              <AgentToolTrace trace={msg.toolTrace} compact />
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble chat-bubble--assistant">
            <span className="chat-bubble__role">Agent</span>
            <p className="chat-bubble__text typing">Invoking tools…</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-form" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder="e.g. Scan all connectors and report failures"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="chat-send" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
