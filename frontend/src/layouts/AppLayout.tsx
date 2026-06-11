import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { CommandPalette } from '../components/CommandPalette';
import { useCommandPaletteActions } from '../hooks/useCommandPaletteActions';

export function AppLayout() {
  const navigate = useNavigate();
  const actions = useCommandPaletteActions(
    () => navigate('/command-center'),
    () => navigate('/pipelines'),
  );

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
      <CommandPalette actions={actions} />
    </div>
  );
}
