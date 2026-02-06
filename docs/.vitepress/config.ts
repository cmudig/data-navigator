import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Data Navigator',
  description: 'A JavaScript library that allows for accessible navigation of data structures.',
  
  // GitHub Pages deployment
  base: '/data-navigator/',
  
  head: [
    // Favicon
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/data-navigator/favicon.ico' }],

    // Bokeh JS - required for examples
    ['script', { 
      src: 'https://cdn.bokeh.org/bokeh/release/bokeh-3.7.3.min.js',
      crossorigin: 'anonymous'
    }],
    ['script', { 
      src: 'https://cdn.bokeh.org/bokeh/release/bokeh-gl-3.7.3.min.js',
      crossorigin: 'anonymous'
    }],
    ['script', { 
      src: 'https://cdn.bokeh.org/bokeh/release/bokeh-widgets-3.7.3.min.js',
      crossorigin: 'anonymous'
    }],
    ['script', { 
      src: 'https://cdn.bokeh.org/bokeh/release/bokeh-tables-3.7.3.min.js',
      crossorigin: 'anonymous'
    }],
    ['script', { 
      src: 'https://cdn.bokeh.org/bokeh/release/bokeh-api-3.7.3.min.js',
      crossorigin: 'anonymous'
    }],
    // D3 - for structure visualization
    ['script', { 
      src: 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js'
    }],
    // Meta tags
    ['meta', { name: 'theme-color', content: '#1e3369' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Data Navigator' }],
    ['meta', { 
      property: 'og:description', 
      content: 'A JavaScript library that allows for accessible navigation of data structures.' 
    }],
    ['meta', { property: 'og:url', content: 'https://dig.cmu.edu/data-navigator/' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:site', content: '@frankElavsky' }],
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
            { 
              text: 'Building Basics',
              collapsed: false,
              items: [
                { text: 'Structure', link: '/getting-started/structure' },
                { text: 'Input', link: '/getting-started/input' },
                { text: 'Rendering', link: '/getting-started/rendering' }
              ]
            },
            { text: 'First Navigable Chart', link: '/getting-started/first-chart' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' }
          ]
        }
      ]
    },

    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/cmudig/data-navigator' }
    ],

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
  }
})
