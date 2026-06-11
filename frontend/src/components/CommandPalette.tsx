import { useCallback, useEffect, useState } from 'react';
import type { CommandAction } from './commandPaletteTypes';

export type { CommandAction } from './commandPaletteTypes';

interface CommandPaletteProps {
  actions: CommandAction[];
}

export function CommandPalette({ actions }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const filtered = actions.filter(
    (a) =>
      !query ||
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.group.toLowerCase().includes(query.toLowerCase()),
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelected(0);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === 'Enter' && filtered[selected]) {
        e.preventDefault();
        filtered[selected].action();
        close();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, selected, close]);

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={close}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <input
          className="cmdk__input"
          placeholder="Search commands… (navigate, scan, remediate)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          autoFocus
        />
        <ul className="cmdk__list">
          {filtered.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                className={`cmdk__item${i === selected ? ' cmdk__item--selected' : ''}`}
                onClick={() => {
                  a.action();
                  close();
                }}
                onMouseEnter={() => setSelected(i)}
              >
                <span className="cmdk__label">{a.label}</span>
                <span className="cmdk__group">{a.group}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="cmdk__empty muted">No matching commands</li>}
        </ul>
        <div className="cmdk__footer">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
