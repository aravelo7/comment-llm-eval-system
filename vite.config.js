import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/auth': {
                target: 'http://127.0.0.1:8787',
                changeOrigin: true,
            },
            '/health': {
                target: 'http://127.0.0.1:8787',
                changeOrigin: true,
            },
            '/imports': {
                target: 'http://127.0.0.1:8787',
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
