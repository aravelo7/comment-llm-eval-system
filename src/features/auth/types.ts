export type UserRole = 'admin' | 'reviewer' | 'analyst';
export type UserPlan = 'free' | 'vip';
export type UserStatus = 'active' | 'disabled';

export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  role: UserRole;
  plan: UserPlan;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  sessionToken: string;
  user: AuthUser;
  expiresAt: number;
};

export type LoginPayload = {
  email: string;
  password: string;
  remember: boolean;
};

export type RegisterPayload = {
  email: string;
  nickname: string;
  password: string;
  confirmPassword: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type AuthResponse = {
  user: AuthUser;
  expiresAt?: string;
  authProvider?: 'password' | 'mock';
  sessionStatus?: 'authenticated' | 'anonymous';
  sessionToken?: string;
};

export type AuthMode = 'mock' | 'api';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOO_MANY_REQUESTS'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR';

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  safeMessage: string;

  constructor(code: ApiErrorCode, status: number, safeMessage: string) {
    super(safeMessage);
    this.code = code;
    this.status = status;
    this.safeMessage = safeMessage;
  }
}
