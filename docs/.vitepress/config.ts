import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'Data Navigator',
    description: 'A JavaScript library that allows for accessible navigation of data structures.',

    // GitHub Pages deployment
    base: '/data-navigator/',

    head: [
        // Favicon
        ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],

        // Bokeh JS - required for examples
        [
            'script',
            {
                src: 'https://cdn.bokeh.org/bokeh/release/bokeh-3.7.3.min.js',
                crossorigin: 'anonymous'
            }
        ],
        [
            'script',
            {
                src: 'https://cdn.bokeh.org/bokeh/release/bokeh-gl-3.7.3.min.js',
                crossorigin: 'anonymous'
            }
        ],
        [
            'script',
            {
                src: 'https://cdn.bokeh.org/bokeh/release/bokeh-widgets-3.7.3.min.js',
                crossorigin: 'anonymous'
            }
        ],
        [
            'script',
            {
                src: 'https://cdn.bokeh.org/bokeh/release/bokeh-tables-3.7.3.min.js',
                crossorigin: 'anonymous'
            }
        ],
        [
            'script',
            {
                src: 'https://cdn.bokeh.org/bokeh/release/bokeh-api-3.7.3.min.js',
                crossorigin: 'anonymous'
            }
        ],
        // Visa Chart Components - for examples
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
        ],
        [
            'script',
            {
                src: 'https://cdn.jsdelivr.net/npm/@visa/line-chart@7.0.1/dist/line-chart/line-chart.js',
                'data-stencil-namespace': 'line-chart'
            }
        ],
        // D3 - for structure visualization
        [
            'script',
            {
                src: 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js'
            }
        ],
        // Meta tags
        ['meta', { name: 'theme-color', content: '#1e3369' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:title', content: 'Data Navigator' }],
        [
            'meta',
            {
                property: 'og:description',
                content: 'A JavaScript library that allows for accessible navigation of data structures.'
            }
        ],
        ['meta', { property: 'og:url', content: 'https://dig.cmu.edu/data-navigator/' }],
        ['meta', { name: 'twitter:card', content: 'summary' }],
        ['meta', { name: 'twitter:site', content: '@frankElavsky' }]
    ],

    themeConfig: {
        // Logo and branding
        logo: '/logo.svg',
        siteTitle: 'Data Navigator',

        // Navigation
        nav: [
            { text: 'Demo', link: '/demo' },
            { text: 'Guide', link: '/getting-started/' },
            { text: 'Examples', link: '/examples/' },
            { text: 'API', link: '/api/' },
            {
                text: 'Resources',
                items: [
                    { text: 'Inspector', link: 'https://dig.cmu.edu/data-navigator/inspector/' },
                    { text: 'Paper', link: 'https://www.frank.computer/data-navigator/' },
                    { text: 'GitHub', link: 'https://github.com/cmudig/data-navigator' },
                    { text: 'npm', link: 'https://www.npmjs.com/package/data-navigator' }
                ]
            }
        ],

        // Sidebar - accessible nested navigation
        sidebar: {
            '/getting-started/': [
                {
                    text: 'Getting Started',
                    items: [
                        { text: 'Introduction', link: '/getting-started/' },
                        { text: 'Installation', link: '/getting-started/installation' },
                        { text: 'Example Dataset', link: '/getting-started/dataset' },
                        { text: 'Example Visualization', link: '/getting-started/visualization' },
                        { text: 'Structure', link: '/getting-started/structure' },
                        { text: 'Input', link: '/getting-started/input' },
                        { text: 'Rendering', link: '/getting-started/rendering' },
                        { text: 'First Navigable Chart', link: '/getting-started/first-chart' }
                    ]
                }
            ],
            '/examples/': [
                {
                    text: 'Examples',
                    items: [
                        { text: 'Overview', link: '/examples/' },
                        { text: 'Simple List Navigation', link: '/examples/simple-list' },
                        { text: 'Using the Inspector', link: '/examples/using-the-inspector' },
                        { text: 'Inspecting Two Trees', link: '/examples/inspecting-two-trees' },
                        { text: 'Understanding Dimensions', link: '/examples/understanding-dimensions' },
                        { text: 'Dimensions API Example', link: '/examples/dimensions-api' },
                        { text: 'Stacked Bar Chart', link: '/examples/stacked-bar' }
                    ]
                }
            ],
            '/api/': [
                {
                    text: 'API Reference',
                    items: [{ text: 'Overview', link: '/api/' }]
                }
            ]
        },

        // Social links
        socialLinks: [{ icon: 'github', link: 'https://github.com/cmudig/data-navigator' }],

        // Footer
        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2023-Present CMU Data Interaction Group'
        },

        // Search
        search: {
            provider: 'local'
        },

        // Edit link
        editLink: {
            pattern: 'https://github.com/cmudig/data-navigator/edit/main/docs/:path',
            text: 'Edit this page on GitHub'
        }
    },

    // Markdown configuration
    markdown: {
        theme: {
            light: 'github-light',
            dark: 'github-dark'
        },
        lineNumbers: true
    },

    // Vite configuration
    vite: {
        resolve: {
            alias: {
                'data-navigator': '../../packages/data-navigator/src/index.ts',
                'data-navigator-inspector': '../../packages/inspector/src/inspector.js',
                '@data-navigator/inspector': '../../packages/inspector/src/inspector.js'
            }
        }
    }
});
