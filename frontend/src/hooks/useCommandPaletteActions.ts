import { useNavigate } from 'react-router-dom';
import type { CommandAction } from '../components/commandPaletteTypes';

export function useCommandPaletteActions(
  onScan?: () => void,
  onRemediate?: () => void,
): CommandAction[] {
  const navigate = useNavigate();
  return [
    {
      id: 'scan',
      label: 'Run full reliability scan',
      group: 'Intelligence',
      action: () => onScan?.() ?? navigate('/command-center'),
    },
    {
      id: 'remediate',
      label: 'Autonomous fix — GA4 connector',
      group: 'Remediation',
      action: () => onRemediate?.() ?? navigate('/pipelines'),
    },
    { id: 'overview', label: 'Go to Overview', group: 'Navigate', action: () => navigate('/') },
    { id: 'pipelines', label: 'Go to Pipelines', group: 'Navigate', action: () => navigate('/pipelines') },
    { id: 'obs', label: 'Go to Observability', group: 'Navigate', action: () => navigate('/observability') },
    { id: 'incidents', label: 'Go to Incidents', group: 'Navigate', action: () => navigate('/incidents') },
    { id: 'cmd', label: 'Go to Command Center', group: 'Navigate', action: () => navigate('/command-center') },
    { id: 'settings', label: 'Go to Settings', group: 'Navigate', action: () => navigate('/settings') },
  ];
}
