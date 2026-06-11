import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { PipelinesPage } from './pages/PipelinesPage';
import { ObservabilityPage } from './pages/ObservabilityPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CommandCenterPage } from './pages/CommandCenterPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="command-center" element={<CommandCenterPage />} />
        <Route path="pipelines" element={<PipelinesPage />} />
        <Route path="observability" element={<ObservabilityPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
