import { FormEvent, useEffect, useState } from 'react';
import type { Connector } from '../lib/types';
import { SCHEDULE_PRESETS } from '../lib/connectorSchedules';

interface ConnectorEditFormProps {
  connector: Connector;
  saving?: boolean;
  onSave: (updates: { name: string; schedule: string }) => void;
}

export function ConnectorEditForm({ connector, saving, onSave }: ConnectorEditFormProps) {
  const [name, setName] = useState(connector.name);
  const [schedule, setSchedule] = useState(connector.schedule ?? 'every 1 hour');
  const [customSchedule, setCustomSchedule] = useState('');
  const isPreset = SCHEDULE_PRESETS.includes(schedule as (typeof SCHEDULE_PRESETS)[number]);
  const [useCustom, setUseCustom] = useState(!isPreset && Boolean(connector.schedule));

  useEffect(() => {
    setName(connector.name);
    const preset = connector.schedule && SCHEDULE_PRESETS.includes(connector.schedule as (typeof SCHEDULE_PRESETS)[number]);
    if (preset) {
      setSchedule(connector.schedule!);
      setUseCustom(false);
      setCustomSchedule('');
    } else if (connector.schedule) {
      setUseCustom(true);
      setCustomSchedule(connector.schedule);
      setSchedule('every 1 hour');
    }
  }, [connector.id, connector.name, connector.schedule]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const finalSchedule = useCustom ? customSchedule.trim() : schedule;
    if (!name.trim() || !finalSchedule) return;
    onSave({ name: name.trim(), schedule: finalSchedule });
  }

  return (
    <form className="connector-edit" onSubmit={handleSubmit}>
      <h3 className="drawer__section-title">Connector settings</h3>
      <p className="muted connector-edit__hint">
        Update display name and sync schedule. Changes apply immediately in demo mode.
      </p>

      <label className="form-field">
        <span>Display name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Connector name"
        />
      </label>

      <label className="form-field">
        <span>Sync schedule</span>
        {!useCustom ? (
          <select value={schedule} onChange={(e) => setSchedule(e.target.value)}>
            {SCHEDULE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={customSchedule}
            onChange={(e) => setCustomSchedule(e.target.value)}
            placeholder="e.g. every 2 hours, daily at 3am"
          />
        )}
      </label>

      <button
        type="button"
        className="btn btn--ghost btn--sm connector-edit__toggle"
        onClick={() => setUseCustom((v) => !v)}
      >
        {useCustom ? 'Use preset schedule' : 'Use custom schedule'}
      </button>

      <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
