import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntdApp, theme } from 'antd';

import { AppRouter } from './app/router';
import { AuthInitializer } from './features/auth/components/AuthInitializer';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 12,
          colorBgLayout: '#f4f7fb',
          fontSize: 14,
        },
      }}
    >
      <AntdApp>
        <AuthInitializer>
          <AppRouter />
        </AuthInitializer>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
);
