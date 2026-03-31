import { useEffect } from 'react';

import { useAuthStore } from '../store';

type AuthInitializerProps = {
  children: React.ReactNode;
};

let hasStartedAuthInitialization = false;

export function AuthInitializer({ children }: AuthInitializerProps) {
  useEffect(() => {
    if (hasStartedAuthInitialization) {
      return;
    }

    hasStartedAuthInitialization = true;
    void useAuthStore.getState().initialize();
  }, []);

  return <>{children}</>;
}
