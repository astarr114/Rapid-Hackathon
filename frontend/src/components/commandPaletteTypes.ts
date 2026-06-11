export interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  group: string;
  action: () => void;
}
