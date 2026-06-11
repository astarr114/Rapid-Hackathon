// Dev: Vite proxies /api → localhost:3001 (see vite.config.ts)
// Prod: set VITE_API_URL or defaults to localhost:3001
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    });
  } catch {
    throw new Error(
      'Cannot reach backend. Start it with: cd backend && npm run dev (port 3001)',
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}
