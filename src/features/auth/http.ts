import { apiBaseUrl } from './config';
import { buildLoginRedirect, isPublicAuthPath } from './redirect';
import { recordAuthEvent } from './audit';
import { clearSession } from './storage';
import { ApiError } from './types';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  credentials?: RequestCredentials;
  suppress401Redirect?: boolean;
  unauthorizedMessage?: string;
};

let unauthorizedHandler: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

function buildHeaders() {
  return new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });
}

function getSafeErrorMessage(status: number) {
  if (status === 401) {
    return '登录状态已失效，请重新登录';
  }
  if (status === 403) {
    return '当前账号没有权限执行此操作';
  }
  if (status === 429) {
    return '操作过于频繁，请稍后再试';
  }
  if (status >= 500) {
    return '服务暂时不可用，请稍后重试';
  }
  return '请求未成功，请检查输入后重试';
}

function redirectToLogin() {
  if (isPublicAuthPath(window.location.pathname)) {
    return;
  }

  window.location.replace(
    buildLoginRedirect({
      pathname: window.location.pathname,
      search: window.location.search,
    }),
  );
}

export async function requestJson<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || 'GET',
    headers: buildHeaders(),
    credentials: options.credentials || 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).catch(() => {
    throw new ApiError('NETWORK_ERROR', 0, '网络不可用，请稍后重试');
  });

  if (!response.ok) {
    const safeMessage =
      response.status === 401 && options.unauthorizedMessage
        ? options.unauthorizedMessage
        : getSafeErrorMessage(response.status);

    if (response.status === 401) {
      clearSession();
      unauthorizedHandler?.();
      recordAuthEvent('auth_session_expired', { status: response.status });
      if (!options.suppress401Redirect) {
        redirectToLogin();
      }
      throw new ApiError('UNAUTHORIZED', response.status, safeMessage);
    }

    if (response.status === 403) {
      throw new ApiError('FORBIDDEN', response.status, safeMessage);
    }

    if (response.status === 429) {
      throw new ApiError('TOO_MANY_REQUESTS', response.status, safeMessage);
    }

    if (response.status >= 500) {
      throw new ApiError('SERVER_ERROR', response.status, safeMessage);
    }

    throw new ApiError('VALIDATION_ERROR', response.status, safeMessage);
  }

  return (await response.json()) as T;
}
