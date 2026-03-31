import type { AuthSession } from './types';

export const AUTH_STORAGE_KEY = 'bot-review-workbench.mock-auth-session.v1';
export const MOCK_USERS_STORAGE_KEY = 'bot-review-workbench.mock-users.v1';

export function readSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSession;
    if (
      !parsed ||
      typeof parsed.sessionToken !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      !parsed.user
    ) {
      return null;
    }

    if (Date.now() >= parsed.expiresAt) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeSession(session: AuthSession | null) {
  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
