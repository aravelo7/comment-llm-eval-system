import { Spin } from 'antd';
import { lazy, Suspense } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '../layout';
import { GuestRoute } from '../../features/auth/components/GuestRoute';
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute';
import { ForgotPasswordPage } from '../../features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { RegisterPage } from '../../features/auth/pages/RegisterPage';

const DashboardPage = lazy(() =>
  import('../../pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const SubmissionsPage = lazy(() =>
  import('../../pages/SubmissionsPage').then((module) => ({
    default: module.SubmissionsPage,
  })),
);
const RulesPage = lazy(() =>
  import('../../pages/RulesPage').then((module) => ({
    default: module.RulesPage,
  })),
);
const PluginsPage = lazy(() =>
  import('../../pages/PluginsPage').then((module) => ({
    default: module.PluginsPage,
  })),
);
const PluginConfigPage = lazy(() =>
  import('../../pages/plugins/PluginConfigPage').then((module) => ({
    default: module.PluginConfigPage,
  })),
);
const SecurityPage = lazy(() =>
  import('../../pages/SecurityPage').then((module) => ({
    default: module.SecurityPage,
  })),
);
const AuditPage = lazy(() =>
  import('../../pages/AuditPage').then((module) => ({
    default: module.AuditPage,
  })),
);
const SettingsPage = lazy(() =>
  import('../../pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
);
const ReviewLabPage = lazy(() =>
  import('../../pages/ReviewLabPage').then((module) => ({
    default: module.ReviewLabPage,
  })),
);
const WeiboManualImportPage = lazy(() =>
  import('../../pages/WeiboManualImportPage').then((module) => ({
    default: module.WeiboManualImportPage,
  })),
);

function withSuspense(element: React.ReactNode) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '60vh',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Spin size="large" />
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <GuestRoute>
        <RegisterPage />
      </GuestRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <GuestRoute>
        <ForgotPasswordPage />
      </GuestRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: withSuspense(<DashboardPage />),
      },
      {
        path: 'submissions',
        element: withSuspense(<SubmissionsPage />),
      },
      {
        path: 'rules',
        element: withSuspense(<RulesPage />),
      },
      {
        path: 'review-lab',
        element: withSuspense(<ReviewLabPage />),
      },
      {
        path: 'plugins',
        element: withSuspense(<PluginsPage />),
      },
      {
        path: 'plugins/:platform',
        element: withSuspense(<PluginConfigPage />),
      },
      {
        path: 'imports/weibo/manual',
        element: withSuspense(<WeiboManualImportPage />),
      },
      {
        path: 'security',
        element: withSuspense(<SecurityPage />),
      },
      {
        path: 'audit',
        element: withSuspense(<AuditPage />),
      },
      {
        path: 'settings',
        element: withSuspense(<SettingsPage />),
      },
    ],
  },
]);
