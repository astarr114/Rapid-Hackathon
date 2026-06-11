import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { BriefingSection, ExecutiveBriefing } from '../lib/types';

interface ExecutiveBriefingPanelProps {
  onPromptSelect?: (prompt: string) => void;
}

const SECTION_META: Record<string, { icon: string; accent: string }> = {
  Situation: { icon: '◉', accent: 'situation' },
  'Blast radius': { icon: '◎', accent: 'blast' },
  'Active incidents': { icon: '⚠', accent: 'incidents' },
  'Cost & efficiency': { icon: '◈', accent: 'cost' },
  'Recommended actions': { icon: '→', accent: 'actions' },
};

function sectionMeta(title: string) {
  return SECTION_META[title] ?? { icon: '•', accent: 'default' };
}

function BriefingSectionCard({ section }: { section: BriefingSection }) {
  const meta = sectionMeta(section.title);
  return (
    <article className={`briefing-card briefing-card--${meta.accent}`}>
      <div className="briefing-card__icon" aria-hidden>
        {meta.icon}
      </div>
      <div className="briefing-card__body">
        <h4 className="briefing-card__title">{section.title}</h4>
        <p className="briefing-card__text">{section.body}</p>
        <div className="briefing-card__citations">
          {section.citations.map((c) => (
            <span key={c} className="citation-chip">
              {c}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
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

  const scoreTone =
    briefing && briefing.score < 60 ? 'danger' : briefing && briefing.score < 80 ? 'warning' : 'success';

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
        <div className="executive-briefing__layout">
          <aside className={`briefing-hero briefing-hero--${scoreTone}`}>
            <div className="briefing-hero__score">
              <span className="briefing-hero__number">{briefing.score}</span>
              <span className="briefing-hero__grade">{briefing.grade}</span>
            </div>
            <div className="briefing-hero__meta">
              <span className={`badge badge--${scoreTone}`}>
                {briefing.trend === 'declining' ? '↓ Declining' : '→ Stable'}
              </span>
              <span className={`badge badge--${briefing.agentMode === 'agent_builder' ? 'success' : 'warning'}`}>
                {briefing.agentMode === 'agent_builder' ? 'Live agent' : 'Demo'}
              </span>
            </div>
            <h3 className="briefing-hero__headline">{briefing.headline}</h3>
            <p className="briefing-hero__time muted">
              {new Date(briefing.generatedAt).toLocaleString()}
            </p>
            <div className="briefing-hero__sources">
              <span className="meta-label">Grounded in</span>
              <div className="grounding-chips">
                {briefing.groundedIn.map((name) => (
                  <span key={name} className="grounding-chip">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          <div className="executive-briefing__main">
            {briefing.geminiNarrative && (
              <div className="briefing-narrative">
                <span className="briefing-narrative__label">Gemini narrative</span>
                <p>{briefing.geminiNarrative}</p>
              </div>
            )}

            <div className="briefing-cards-grid">
              {briefing.sections.map((section) => (
                <BriefingSectionCard key={section.title} section={section} />
              ))}
            </div>

            {onPromptSelect && briefing.suggestedPrompts.length > 0 && (
              <div className="briefing-prompts">
                <span className="meta-label">Suggested next steps — ask the agent</span>
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
