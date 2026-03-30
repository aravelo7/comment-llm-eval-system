const PUBLIC_AUTH_PATHS = new Set(['/login', '/register', '/forgot-password']);

export const DEFAULT_AUTHENTICATED_PATH = '/dashboard';

type RedirectLocation = {
  pathname: string;
  search: string;
};

function normalizePathname(pathname: string) {
  if (!pathname) {
    return '/';
  }

  return pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.has(normalizePathname(pathname));
}

export function getSafeRedirectTarget(location: RedirectLocation) {
  const pathname = normalizePathname(location.pathname);

  if (isPublicAuthPath(pathname)) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  const searchParams = new URLSearchParams(location.search);
  searchParams.delete('redirect');

  const search = searchParams.toString();
  return `${pathname}${search ? `?${search}` : ''}`;
}

export function sanitizeRedirectTarget(redirect: string | null | undefined) {
  if (!redirect) {
    return null;
  }

  const trimmed = redirect.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  try {
    const url = new URL(trimmed, window.location.origin);
    const pathname = normalizePathname(url.pathname);

    if (url.origin !== window.location.origin || isPublicAuthPath(pathname)) {
      return null;
    }

    if (url.searchParams.has('redirect')) {
      return null;
    }

    const search = url.searchParams.toString();
    return `${pathname}${search ? `?${search}` : ''}`;
  } catch {
    return null;
  }
}

export function buildLoginRedirect(location: RedirectLocation) {
  const pathname = normalizePathname(location.pathname);

  if (isPublicAuthPath(pathname)) {
    return '/login';
  }

  const redirect = getSafeRedirectTarget(location);
  return redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : '/login';
}
