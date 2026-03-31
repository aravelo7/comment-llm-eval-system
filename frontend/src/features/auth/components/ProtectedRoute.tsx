import { Spin } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';

import { buildLoginRedirect, isPublicAuthPath } from '../redirect';
import { useAuthStore } from '../store';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const pathname = location.pathname;

  if (!initialized || status === 'idle') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (isPublicAuthPath(pathname)) {
    return <>{children}</>;
  }

  if (status !== 'authenticated') {
    return <Navigate to={buildLoginRedirect(location)} replace />;
  }

  return <>{children}</>;
}
