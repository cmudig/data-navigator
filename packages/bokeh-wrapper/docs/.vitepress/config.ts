import { defineConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    title: 'Data Navigator · Bokeh Wrapper',
    description:
        'Add accessible data navigation to Bokeh charts with one function call.',

    base: '/data-navigator/bokeh-wrapper/',

    head: [
        // Bokeh JS
        ['script', { src: 'https://cdn.bokeh.org/bokeh/release/bokeh-3.7.3.min.js', crossorigin: 'anonymous' }],
        ['script', { src: 'https://cdn.bokeh.org/bokeh/release/bokeh-gl-3.7.3.min.js', crossorigin: 'anonymous' }],
        ['script', { src: 'https://cdn.bokeh.org/bokeh/release/bokeh-widgets-3.7.3.min.js', crossorigin: 'anonymous' }],
        ['script', { src: 'https://cdn.bokeh.org/bokeh/release/bokeh-api-3.7.3.min.js', crossorigin: 'anonymous' }],
        // Meta
        ['meta', { name: 'theme-color', content: '#1e3369' }]
    ],

    themeConfig: {
        siteTitle: 'Bokeh Wrapper',
        logo: false,

        nav: [
            { text: 'Getting Started', link: '/getting-started' },
            { text: 'Examples', link: '/examples/bar-chart' },
            {
                text: 'Resources',
                items: [
                    { text: 'Data Navigator Docs', link: 'https://dig.cmu.edu/data-navigator/' },
                    { text: 'Inspector', link: 'https://dig.cmu.edu/data-navigator/inspector/' },
                    { text: 'Bokeh Accessibility Audit', link: 'https://bokeh-a11y-audit.readthedocs.io/' },
                    { text: 'GitHub', link: 'https://github.com/cmudig/data-navigator' },
                    { text: 'npm', link: 'https://www.npmjs.com/package/@data-navigator/bokeh-wrapper' }
                ]
            }
        ],

        sidebar: [
            {
                text: 'Introduction',
                items: [
                    { text: 'Overview', link: '/' },
                    { text: 'Getting Started', link: '/getting-started' }
                ]
            },
            {
                text: 'Examples',
                items: [
                    { text: 'Bar Chart', link: '/examples/bar-chart' },
                    { text: 'Scatter Plot', link: '/examples/scatter' },
                    { text: 'Line Chart', link: '/examples/line-chart' },
                    { text: 'Stacked Bar Chart', link: '/examples/stacked-bar' },
                    { text: 'Using the Inspector', link: '/examples/with-inspector' }
                ]
            }
        ],

        socialLinks: [{ icon: 'github', link: 'https://github.com/cmudig/data-navigator' }],

        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2023-Present CMU Data Interaction Group'
        },

        search: { provider: 'local' }
    },

    markdown: {
        theme: { light: 'github-light', dark: 'github-dark' },
        lineNumbers: true
    },

    vite: {
        resolve: {
            alias: {
                'data-navigator/text-chat.css': resolve(
                    __dirname,
                    '../../../../packages/data-navigator/text-chat.css'
                ),
                'data-navigator': resolve(
                    __dirname,
                    '../../../../packages/data-navigator/src/index.ts'
                ),
                '@data-navigator/bokeh-wrapper': resolve(__dirname, '../../src/index.ts'),
                '@data-navigator/inspector': resolve(
                    __dirname,
                    '../../../inspector/src/inspector.js'
                )
            }
        }
    }
});
