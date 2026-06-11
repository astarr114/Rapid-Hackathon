import { FormEvent, useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import type { ReactNode } from 'react';
import type { AppSettings } from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { api } from '../lib/api';

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-section">
      <div className="settings-section__header">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [saved, setSaved] = useState(false);
  const [envStats, setEnvStats] = useState({ connectors: 0, incidents: 0, updatedAt: '' });

  useEffect(() => {
    setDraft({ ...settings });
  }, [settings]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [conn, inc] = await Promise.all([
          api<{ connectors: unknown[] }>('/fivetran/list-connectors', { method: 'POST' }),
          api<{ incidents: unknown[] }>('/mongo/list-incidents'),
        ]);
        setEnvStats({
          connectors: conn.connectors.length,
          incidents: inc.incidents.length,
          updatedAt: new Date().toLocaleString(),
        });
      } catch {
        /* optional */
      }
    }
    loadStats();
  }, []);

  function patch(key: keyof AppSettings, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateSettings(draft);
    setSaved(true);
    showToast('Settings saved (demo only).');
  }

  function handleReset() {
    resetSettings();
    setDraft({ ...DEFAULT_SETTINGS });
    setSaved(false);
    showToast('Settings reset to defaults.', 'info');
  }

  return (
    <>
      <Topbar
        title="Settings"
        subtitle="Integration configuration — stored in browser memory for demo purposes"
      />

      <div className="card demo-env-card">
        <h2 className="card__title">Current demo environment</h2>
        <dl className="demo-env-stats">
          <div>
            <dt>Demo connectors</dt>
            <dd>{envStats.connectors}</dd>
          </div>
          <div>
            <dt>Demo incidents</dt>
            <dd>{envStats.incidents}</dd>
          </div>
          <div>
            <dt>Stats refreshed</dt>
            <dd>{envStats.updatedAt || '—'}</dd>
          </div>
        </dl>
      </div>

      <form className="settings-form" onSubmit={handleSubmit}>
        <SettingsSection
          title="Agent configuration"
          description="Used by the SRE Agent chat panel. In production, these live in backend/.env."
        >
          <div className="form-grid">
            <Field
              label="Gemini API key"
              type="password"
              value={draft.geminiApiKey}
              onChange={(v) => patch('geminiApiKey', v)}
              placeholder="AIza…"
            />
            <Field
              label="Agent ID"
              value={draft.agentId}
              onChange={(v) => patch('agentId', v)}
              placeholder="agents/YOUR_AGENT_ID"
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Fivetran" description="Pipeline connector credentials.">
          <div className="form-grid">
            <Field
              label="API key"
              type="password"
              value={draft.fivetranApiKey}
              onChange={(v) => patch('fivetranApiKey', v)}
            />
            <Field
              label="API secret"
              type="password"
              value={draft.fivetranApiSecret}
              onChange={(v) => patch('fivetranApiSecret', v)}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Elastic" description="Log search and observability cluster.">
          <div className="form-grid">
            <Field
              label="Cloud ID"
              value={draft.elasticCloudId}
              onChange={(v) => patch('elasticCloudId', v)}
            />
            <Field
              label="API key"
              type="password"
              value={draft.elasticApiKey}
              onChange={(v) => patch('elasticApiKey', v)}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="MongoDB" description="Incident store and playbook metadata.">
          <div className="form-grid">
            <Field label="URI" value={draft.mongoUri} onChange={(v) => patch('mongoUri', v)} />
            <Field
              label="Database name"
              value={draft.mongoDatabase}
              onChange={(v) => patch('mongoDatabase', v)}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="BigQuery" description="Freshness checks and downstream impact analysis.">
          <div className="form-grid">
            <Field
              label="Project ID"
              value={draft.bigqueryProjectId}
              onChange={(v) => patch('bigqueryProjectId', v)}
            />
            <Field
              label="Dataset ID"
              value={draft.bigqueryDatasetId}
              onChange={(v) => patch('bigqueryDatasetId', v)}
            />
          </div>
        </SettingsSection>

        <div className="settings-actions">
          <button type="submit" className="btn btn--primary">
            Save settings
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleReset}>
            Reset to defaults
          </button>
          {saved && <span className="save-hint">Settings saved (demo only).</span>}
        </div>
      </form>
    </>
  );
}
