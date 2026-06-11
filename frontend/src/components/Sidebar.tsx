import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Overview', icon: '◉', end: true },
  { to: '/command-center', label: 'Command Center', icon: '⬡', end: false },
  { to: '/pipelines', label: 'Pipelines', icon: '⇄', end: false },
  { to: '/observability', label: 'Observability', icon: '◎', end: false },
  { to: '/incidents', label: 'Incidents', icon: '⚠', end: false },
  { to: '/settings', label: 'Settings', icon: '⚙', end: false },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src="/aroa-logo.png" alt="AROA" className="sidebar__logo" />
        <p className="sidebar__tagline">Data Reliability Platform</p>
      </div>
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <span className="sidebar__version">v1.0.0 · Hackathon Demo</span>
      </div>
    </aside>
  );
}
