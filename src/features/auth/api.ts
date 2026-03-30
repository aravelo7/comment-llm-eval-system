import { authMode } from './config';
import { requestJson } from './http';
import {
  mockForgotPassword,
  mockLogin,
  mockLogout,
  mockMe,
  mockRegister,
} from './mock';
import type {
  AuthResponse,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
} from './types';

export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  if (authMode === 'mock') {
    return mockLogin(payload);
  }

  return requestJson<AuthResponse>('/auth/login', {
    method: 'POST',
    suppress401Redirect: true,
    unauthorizedMessage: '邮箱或密码不正确',
    body: {
      email: payload.email,
      password: payload.password,
      remember: payload.remember,
    },
  });
}

export async function registerApi(payload: RegisterPayload): Promise<void> {
  if (authMode === 'mock') {
    return mockRegister(payload);
  }

  await requestJson<{ success: true }>('/auth/register', {
    method: 'POST',
    suppress401Redirect: true,
    body: {
      email: payload.email,
      nickname: payload.nickname,
      password: payload.password,
    },
  });
}

export async function logoutApi(): Promise<void> {
  if (authMode === 'mock') {
    return mockLogout();
  }

  await requestJson<{ success: true }>('/auth/logout', {
    method: 'POST',
  });
}

export async function meApi(sessionToken?: string): Promise<AuthUser> {
  if (authMode === 'mock') {
    return mockMe(sessionToken || '');
  }

  const result = await requestJson<{ user: AuthUser }>('/auth/me', {
    method: 'GET',
  });
  return result.user;
}

export async function forgotPasswordApi(payload: ForgotPasswordPayload): Promise<void> {
  if (authMode === 'mock') {
    return mockForgotPassword(payload);
  }

  await requestJson<{ success: true }>('/auth/forgot-password', {
    method: 'POST',
    body: {
      email: payload.email,
    },
  });
}
