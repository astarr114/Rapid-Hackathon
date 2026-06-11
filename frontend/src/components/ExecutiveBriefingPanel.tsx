import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ExecutiveBriefing } from '../lib/types';

interface ExecutiveBriefingPanelProps {
  onPromptSelect?: (prompt: string) => void;
}

export function ExecutiveBriefingPanel({ onPromptSelect }: ExecutiveBriefingPanelProps) {
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<ExecutiveBriefing>('/intelligence/ai-briefing', { method: 'POST' });
      setBriefing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate briefing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="card executive-briefing">
      <div className="executive-briefing__header">
        <div>
          <h2 className="card__title">Gemini Executive Briefing</h2>
          <p className="card__desc muted">
            Grounded synthesis across pipelines, incidents, lineage, and usage
          </p>
        </div>
        <button type="button" className="btn btn--secondary btn--sm" disabled={loading} onClick={load}>
          {loading ? 'Generating…' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className="alert alert--error alert--compact">{error}</div>}

      {loading && !briefing ? (
        <p className="muted">Agent synthesizing platform briefing…</p>
      ) : briefing ? (
        <>
          <div className="executive-briefing__headline">
            <span className={`badge badge--${briefing.score < 60 ? 'danger' : briefing.score < 80 ? 'warning' : 'success'}`}>
              {briefing.score}/100 · {briefing.grade}
            </span>
            <h3>{briefing.headline}</h3>
            <span className="muted executive-briefing__time">
              Generated {new Date(briefing.generatedAt).toLocaleString()} ·{' '}
              {briefing.agentMode === 'agent_builder' ? 'Live agent' : 'Demo synthesis'}
            </span>
          </div>

          {briefing.geminiNarrative && (
            <div className="executive-briefing__narrative">
              <span className="meta-label">Gemini narrative</span>
              <p>{briefing.geminiNarrative}</p>
            </div>
          )}

          <div className="executive-briefing__sections">
            {briefing.sections.map((section) => (
              <div key={section.title} className="executive-briefing__section">
                <h4>{section.title}</h4>
                <p>{section.body}</p>
                <div className="executive-briefing__citations">
                  {section.citations.map((c) => (
                    <span key={c} className="citation-chip">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="executive-briefing__grounding">
            <span className="meta-label">Grounded in</span>
            <div className="grounding-chips">
              {briefing.groundedIn.map((name) => (
                <span key={name} className="grounding-chip">
                  {name}
                </span>
              ))}
            </div>
          </div>

          {onPromptSelect && briefing.suggestedPrompts.length > 0 && (
            <div className="executive-briefing__prompts">
              <span className="meta-label">Suggested agent prompts</span>
              <div className="prompt-chips">
                {briefing.suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="prompt-chip"
                    onClick={() => onPromptSelect(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
