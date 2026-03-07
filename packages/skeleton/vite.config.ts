import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [svelte()],
    base: '/data-navigator/skeleton/',
    resolve: {
        alias: {
            'data-navigator': resolve(__dirname, '../../packages/data-navigator/src/index.ts'),
            '@data-navigator/inspector': resolve(__dirname, '../../packages/inspector/src/index.js')
        }
    }
});
