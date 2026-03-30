import { mockSessionTtlMs } from './config';
import { MOCK_USERS_STORAGE_KEY } from './storage';
import type {
  AuthResponse,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
} from './types';
import { ApiError } from './types';

type MockUserRecord = AuthUser & {
  password: string;
};

const now = '2026-03-27T12:00:00.000Z';

const seededUsers: MockUserRecord[] = [
  {
    id: 'user-admin-001',
    email: 'admin@example.com',
    nickname: '平台管理员',
    role: 'admin',
    plan: 'vip',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    password: 'Admin#2026Demo',
  },
  {
    id: 'user-reviewer-001',
    email: 'reviewer@example.com',
    nickname: '一线审核员',
    role: 'reviewer',
    plan: 'free',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    password: 'Reviewer#2026Demo',
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readUsers() {
  try {
    const raw = window.localStorage.getItem(MOCK_USERS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(seededUsers));
      return seededUsers;
    }

    const parsed = JSON.parse(raw) as MockUserRecord[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seededUsers;
  } catch {
    window.localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(seededUsers));
    return seededUsers;
  }
}

function writeUsers(users: MockUserRecord[]) {
  window.localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
}

function buildResponse(user: AuthUser): AuthResponse {
  return {
    user,
    expiresAt: new Date(Date.now() + mockSessionTtlMs).toISOString(),
    authProvider: 'mock',
    sessionStatus: 'authenticated',
    sessionToken: `mock-session-${user.id}-${Date.now()}`,
  };
}

function genericLoginError() {
  return new ApiError('UNAUTHORIZED', 401, '邮箱或密码不正确');
}

export async function mockLogin(payload: LoginPayload): Promise<AuthResponse> {
  await sleep(500);

  const users = readUsers();
  const matched = users.find(
    (item) =>
      item.email.toLowerCase() === payload.email.toLowerCase() &&
      item.password === payload.password,
  );

  if (!matched || matched.status !== 'active') {
    throw genericLoginError();
  }

  const { password: _password, ...user } = matched;
  return buildResponse(user);
}

export async function mockRegister(payload: RegisterPayload): Promise<void> {
  await sleep(700);

  const users = readUsers();
  const exists = users.some((item) => item.email.toLowerCase() === payload.email.toLowerCase());

  if (exists) {
    throw new ApiError('VALIDATION_ERROR', 400, '注册未成功，请稍后重试');
  }

  users.push({
    id: `user-${crypto.randomUUID()}`,
    email: payload.email.toLowerCase(),
    nickname: payload.nickname,
    role: 'reviewer',
    plan: 'free',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    password: payload.password,
  });
  writeUsers(users);
}

export async function mockLogout(): Promise<void> {
  await sleep(200);
}

export async function mockMe(sessionToken: string): Promise<AuthUser> {
  await sleep(250);

  if (!sessionToken.startsWith('mock-session-')) {
    throw new ApiError('UNAUTHORIZED', 401, '登录状态已失效，请重新登录');
  }

  const userId = sessionToken.split('-').slice(2, -1).join('-');
  const users = readUsers();
  const matched = users.find((item) => item.id === userId && item.status === 'active');

  if (!matched) {
    throw new ApiError('UNAUTHORIZED', 401, '登录状态已失效，请重新登录');
  }

  const { password: _password, ...user } = matched;
  return user;
}

export async function mockForgotPassword(_payload: ForgotPasswordPayload): Promise<void> {
  await sleep(650);
}
