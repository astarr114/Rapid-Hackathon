import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { AgentMeta, ToolTraceEntry } from '../lib/types';
import { AgentToolTrace } from './AgentToolTrace';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  toolTrace?: ToolTraceEntry[];
  agentMeta?: AgentMeta;
}

interface CommandCenterAgentChatProps {
  seedPrompt?: string;
  onSeedConsumed?: () => void;
}

export function CommandCenterAgentChat({ seedPrompt, onSeedConsumed }: CommandCenterAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Command Center copilot ready. Ask about blast radius, SLA risk, or autonomous remediation.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [lastMeta, setLastMeta] = useState<AgentMeta | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSeed = useRef<string | undefined>();

  useEffect(() => {
    if (seedPrompt && seedPrompt !== lastSeed.current) {
      lastSeed.current = seedPrompt;
      setInput(seedPrompt);
      onSeedConsumed?.();
    }
  }, [seedPrompt, onSeedConsumed]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const data = await api<{
        reply: string;
        sessionId?: string;
        toolTrace?: ToolTraceEntry[];
        agentMeta?: AgentMeta;
      }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, sessionId }),
      });
      if (data.sessionId) setSessionId(data.sessionId);
      if (data.agentMeta) setLastMeta(data.agentMeta);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply, toolTrace: data.toolTrace, agentMeta: data.agentMeta },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reach agent';
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    void sendMessage(text);
  }

  return (
    <div className="card command-center-chat">
      <div className="command-center-chat__header">
        <div>
          <h2 className="card__title">Agent Copilot</h2>
          <p className="card__desc muted">Gemini Agent Builder · multi-turn session · tool trace</p>
        </div>
        {lastMeta && (
          <div className="command-center-chat__session muted">
            <span className={`badge badge--${lastMeta.mode === 'live' ? 'success' : 'warning'}`}>
              {lastMeta.mode}
            </span>
            {lastMeta.interactionId && (
              <span className="session-id" title={lastMeta.interactionId}>
                Session {lastMeta.interactionId.slice(0, 12)}…
              </span>
            )}
          </div>
        )}
      </div>

      <div className="chat-messages chat-messages--compact">
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
            <p className="chat-bubble__text typing">Invoking grounded tools…</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Ask about blast radius, MAR optimization, or remediation…"
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
