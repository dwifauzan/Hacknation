import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    publicDir: process.env.VERCEL ? false : 'public',
    plugins: process.env.VERCEL
        ? [react()]
        : [
            react(),
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.jsx'],
                refresh: true,
            }),
        ],
    build: process.env.VERCEL
        ? {
            outDir: 'dist',
            emptyOutDir: true,
        }
        : undefined,
});
