import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

import { DEFAULT_AUTHENTICATED_PATH, sanitizeRedirectTarget } from '../redirect';
import { useAuthStore } from '../store';

type GuestRouteProps = {
  children: React.ReactNode;
};

export function GuestRoute({ children }: GuestRouteProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized) {
    return null;
  }

  if (status === 'authenticated') {
    const redirect = sanitizeRedirectTarget(searchParams.get('redirect'));
    const nextPath = redirect || DEFAULT_AUTHENTICATED_PATH;
    const currentPath = `${location.pathname}${location.search}`;

    if (nextPath !== currentPath) {
      return <Navigate to={nextPath} replace />;
    }
  }

  return <>{children}</>;
}
