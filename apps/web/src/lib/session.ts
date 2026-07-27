export interface Session {
  readonly token: string;
  readonly userId: string;
  readonly tenantId: string;
}

const STORAGE_KEY = 'wisdum.session';

export const DEFAULT_DEV_SESSION: Session = {
  token: 'dev-session-token',
  userId: '00000000-0000-4000-8000-000000000002',
  tenantId: '00000000-0000-4000-8000-000000000001',
};

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    // In local development, auto-provide dev session if absent
    if (process.env.NODE_ENV !== 'production') {
      saveSession(DEFAULT_DEV_SESSION);
      return DEFAULT_DEV_SESSION;
    }
    return null;
  }
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
