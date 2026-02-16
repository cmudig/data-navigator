import { defineConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    title: 'Data Navigator Inspector',
    description: 'Structure inspector for data-navigator.',

    // Deploy as a sub-path of the main docs site
    base: '/data-navigator/inspector/',

    head: [
        // Visa Chart Components (for stacked bar example)
        [
            'script',
            {
                src: 'https://cdn.jsdelivr.net/npm/@visa/stacked-bar-chart@7.0.1/dist/stacked-bar-chart/stacked-bar-chart.js',
                'data-stencil-namespace': 'stacked-bar-chart'
            }
        ]
    ],

    themeConfig: {
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Examples', link: '/examples/stacked-bar' },
            { text: 'Data Navigator Docs', link: 'https://dig.cmu.edu/data-navigator/' }
        ],
        sidebar: [
            {
                text: 'Inspector',
                items: [
                    { text: 'Overview', link: '/' },
                    { text: 'Stacked Bar Example', link: '/examples/stacked-bar' }
                ]
            }
        ]
    },

    vite: {
        resolve: {
            alias: {
                'data-navigator': resolve(__dirname, '../../../../packages/data-navigator/src/index.ts')
            }
        }
    }
});
