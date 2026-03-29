import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createReadStream } from 'node:fs';
import type { Plugin } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Injects axe-core in dev mode only — violations appear in the browser console.
function makeAxeDevPlugin(): Plugin {
    let axePath: string | null = null;
    try {
        const req = createRequire(import.meta.url);
        axePath = req.resolve('axe-core/axe.min.js');
    } catch {
        // axe-core not installed; plugin is a no-op
    }

    return {
        name: 'axe-dev',
        apply: 'serve',
        configureServer(server) {
            if (!axePath) return;
            server.middlewares.use('/__axe__/axe.min.js', (_req, res) => {
                res.setHeader('Content-Type', 'application/javascript');
                createReadStream(axePath!).pipe(res);
            });
        },
        transformIndexHtml() {
            if (!axePath) return [];
            return [
                {
                    tag: 'script',
                    attrs: { src: '/__axe__/axe.min.js', defer: true },
                    injectTo: 'body'
                },
                {
                    tag: 'script',
                    attrs: { defer: true },
                    injectTo: 'body',
                    children: `
window.addEventListener('load', function() {
    setTimeout(function() {
        window.axe.run().then(function(results) {
            if (results.violations.length > 0) {
                console.group('[axe] ' + results.violations.length + ' violation(s)');
                results.violations.forEach(function(v) {
                    console.warn((v.impact || 'unknown').toUpperCase(), v.id, '-', v.description);
                    v.nodes.forEach(function(n) { console.warn('  node:', n.target.join(', ')); });
                });
                console.groupEnd();
            } else {
                console.log('[axe] No violations found.');
            }
        });
    }, 1500);
});
`
                }
            ];
        }
    };
}

export default defineConfig({
    plugins: [svelte(), makeAxeDevPlugin()],
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
