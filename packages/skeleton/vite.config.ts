import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [svelte()],
    base: '/data-navigator/skeleton/',
    resolve: {
        alias: [
            {
                find: 'data-navigator/text-chat.css',
                replacement: resolve(__dirname, '../../packages/data-navigator/text-chat.css')
            },
            { find: 'data-navigator', replacement: resolve(__dirname, '../../packages/data-navigator/src/index.ts') },
            {
                find: '@data-navigator/inspector/style.css',
                replacement: resolve(__dirname, '../../packages/inspector/style.css')
            },
            {
                find: '@data-navigator/inspector',
                replacement: resolve(__dirname, '../../packages/inspector/src/index.js')
            }
        ]
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vega-embed': ['vega-embed']
                }
            }
        }
    }
});
