import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const runtimeEnv = env.VITE_RUNTIME_ENV || 'local';
  const isDockerRuntime = runtimeEnv === 'docker';

  const authTarget = isDockerRuntime ? 'http://auth:8787' : 'http://127.0.0.1:8787';
  const reviewTarget = isDockerRuntime ? 'http://review:8790' : 'http://127.0.0.1:8790';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/auth': {
          target: authTarget,
          changeOrigin: true,
        },
        '/health': {
          target: authTarget,
          changeOrigin: true,
        },
        '/imports': {
          target: authTarget,
          changeOrigin: true,
        },
        '/api': {
          target: authTarget,
          changeOrigin: true,
        },
        '/review': {
          target: reviewTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'antd-vendor': ['antd', '@ant-design/icons'],
          },
        },
      },
    },
  };
});
