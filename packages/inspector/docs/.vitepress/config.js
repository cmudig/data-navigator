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
        // Visa Chart Components
        [
            'script',
            {
                src: 'https://cdn.jsdelivr.net/npm/@visa/bar-chart@7.0.1/dist/bar-chart/bar-chart.js',
                'data-stencil-namespace': 'bar-chart'
            }
        ],
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
            { text: 'Getting Started', link: '/getting-started' },
            { text: 'Examples', link: '/examples/stacked-bar' },
            { text: 'Tree View', link: '/examples/tree-view' },
            { text: 'Console Menu', link: '/examples/console-menu' },
            { text: 'Data Navigator Docs', link: 'https://dig.cmu.edu/data-navigator/' }
        ],
        sidebar: [
            {
                text: 'Inspector',
                items: [
                    { text: 'Overview', link: '/' },
                    { text: 'Getting Started', link: '/getting-started' },
                    { text: 'Stacked Bar Example', link: '/examples/stacked-bar' },
                    { text: 'Tree View Example', link: '/examples/tree-view' },
                    { text: 'Console Menu Example', link: '/examples/console-menu' }
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
