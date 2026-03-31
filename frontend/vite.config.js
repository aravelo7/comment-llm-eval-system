import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/auth': {
                target: 'http://auth:8787',
                changeOrigin: true,
            },
            '/health': {
                target: 'http://auth:8787',
                changeOrigin: true,
            },
            '/imports': {
                target: 'http://auth:8787',
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
});
