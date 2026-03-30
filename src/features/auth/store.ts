import { create } from 'zustand';

import { forgotPasswordApi, loginApi, logoutApi, meApi, registerApi } from './api';
import { recordAuthEvent } from './audit';
import { authMode, loginThrottleWindowMs } from './config';
import { registerUnauthorizedHandler } from './http';
import { clearSession, readSession, writeSession } from './storage';
import type {
  AuthSession,
  AuthStatus,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
} from './types';

type AuthStoreState = {
  user: AuthUser | null;
  expiresAt: number | null;
  status: AuthStatus;
  initialized: boolean;
  lastLoginAttemptAt: number;
  initialize: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  clearAuth: () => void;
};

function toMockSession(sessionToken: string, user: AuthUser, expiresAt: number): AuthSession {
  return {
    sessionToken,
    user,
    expiresAt,
  };
}

let initializePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  expiresAt: null,
  status: 'idle',
  initialized: false,
  lastLoginAttemptAt: 0,
  async initialize() {
    if (get().initialized) {
      return;
    }

    if (initializePromise) {
      await initializePromise;
      return;
    }

    initializePromise = (async () => {
      if (authMode === 'api') {
        try {
          const user = await meApi();
          set({
            user,
            expiresAt: null,
            status: 'authenticated',
            initialized: true,
          });
        } catch {
          clearSession();
          set({
            user: null,
            expiresAt: null,
            status: 'anonymous',
            initialized: true,
          });
        }
        return;
      }

      const session = readSession();

      if (!session) {
        set({
          user: null,
          expiresAt: null,
          status: 'anonymous',
          initialized: true,
        });
        return;
      }

      try {
        const user = await meApi(session.sessionToken);
        set({
          user,
          expiresAt: session.expiresAt,
          status: 'authenticated',
          initialized: true,
        });
        writeSession({
          ...session,
          user,
        });
      } catch {
        clearSession();
        set({
          user: null,
          expiresAt: null,
          status: 'anonymous',
          initialized: true,
        });
      }
    })();

    try {
      await initializePromise;
    } finally {
      initializePromise = null;
    }
  },
  async login(payload) {
    const now = Date.now();
    if (now - get().lastLoginAttemptAt < loginThrottleWindowMs) {
      throw new Error('请勿频繁提交，请稍后再试');
    }

    set({
      status: 'loading',
      lastLoginAttemptAt: now,
    });

    try {
      const result = await loginApi(payload);
      const expiresAt = result.expiresAt ? new Date(result.expiresAt).getTime() : null;

      if (authMode === 'mock' && result.sessionToken && expiresAt) {
        writeSession(toMockSession(result.sessionToken, result.user, expiresAt));
      }

      set({
        user: result.user,
        expiresAt,
        status: 'authenticated',
      });
      recordAuthEvent('auth_login_success', { email: payload.email, plan: result.user.plan });
    } catch (error) {
      set({
        user: null,
        expiresAt: null,
        status: 'anonymous',
      });
      recordAuthEvent('auth_login_failure', { email: payload.email });
      throw error;
    }
  },
  async register(payload) {
    set({ status: 'loading' });

    try {
      await registerApi(payload);
      set({ status: 'anonymous' });
      recordAuthEvent('auth_register_success', { email: payload.email });
    } catch (error) {
      set({ status: 'anonymous' });
      recordAuthEvent('auth_register_failure', { email: payload.email });
      throw error;
    }
  },
  async logout() {
    try {
      await logoutApi();
    } finally {
      clearSession();
      set({
        user: null,
        expiresAt: null,
        status: 'anonymous',
      });
      recordAuthEvent('auth_logout');
    }
  },
  async forgotPassword(payload) {
    await forgotPasswordApi(payload);
  },
  clearAuth() {
    clearSession();
    set({
      user: null,
      expiresAt: null,
      status: 'anonymous',
    });
  },
}));

registerUnauthorizedHandler(() => {
  useAuthStore.getState().clearAuth();
});
