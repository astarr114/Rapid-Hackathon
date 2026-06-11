import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { LiveEvent } from '../lib/types';

const MAX_EVENTS = 12;

export function LiveOpsFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [live, setLive] = useState(true);
  const lastPoll = useRef<string | undefined>();

  useEffect(() => {
    if (!live) return;

    async function poll() {
      try {
        const qs = lastPoll.current ? `?since=${encodeURIComponent(lastPoll.current)}` : '';
        const data = await api<{ events: LiveEvent[]; serverTime: string }>(
          `/intelligence/live-events${qs}`,
        );
        lastPoll.current = data.serverTime;
        if (data.events.length) {
          setEvents((prev) => [...data.events, ...prev].slice(0, MAX_EVENTS));
        }
      } catch {
        /* silent poll failure */
      }
    }

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [live]);

  return (
    <div className="card live-feed">
      <div className="card__header-row">
        <h2 className="card__title">
          <span className="live-dot" /> Live Ops Feed
        </h2>
        <button
          type="button"
          className={`btn btn--ghost btn--sm${live ? ' btn--live-active' : ''}`}
          onClick={() => setLive((v) => !v)}
        >
          {live ? 'Pause' : 'Resume'}
        </button>
      </div>
      <ul className="live-feed__list">
        {events.length === 0 && (
          <li className="live-feed__item muted">Listening for pipeline events…</li>
        )}
        {events.map((evt) => (
          <li key={evt.id} className={`live-feed__item live-feed__item--${evt.severity}`}>
            <span className="live-feed__time">
              {new Date(evt.timestamp).toLocaleTimeString()}
            </span>
            <span className="live-feed__type">{evt.type}</span>
            <span className="live-feed__msg">{evt.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
