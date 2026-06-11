import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { email, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSignOut() {
    logout();
    navigate('/login');
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : '??';

  return (
    <header className="topbar">
      <div className="topbar__left">
        <h1>{title}</h1>
        {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
      </div>
      <div className="topbar__right">
        <ThemeToggle />
        <span className="topbar__badge">Demo</span>
        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="user-menu__trigger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
          >
            <span className="user-menu__avatar">{initials}</span>
            <span className="user-menu__email">{email}</span>
            <span className="user-menu__chevron">▾</span>
          </button>
          {menuOpen && (
            <div className="user-menu__dropdown">
              <div className="user-menu__info">
                <span className="user-menu__label">Signed in as</span>
                <span className="user-menu__value">{email}</span>
              </div>
              <button type="button" className="user-menu__action" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
