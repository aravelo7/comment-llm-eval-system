import type { AuthMode } from './types';

const rawMode = (import.meta.env.VITE_AUTH_MODE || 'api').toLowerCase();

export const authMode: AuthMode = rawMode === 'mock' ? 'mock' : 'api';
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
export const mockSessionTtlMs = 1000 * 60 * 60 * 8;
export const loginThrottleWindowMs = 1200;
