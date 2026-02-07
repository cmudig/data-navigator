// https://vitepress.dev/guide/custom-theme
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

// Import our custom components
import Example from './components/Example.vue'
import LiveExample from './components/LiveExample.vue'
import Layout from './Layout.vue'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router, siteData }) {
    // Register global components so they can be used in markdown
    app.component('Example', Example)
    app.component('LiveExample', LiveExample)
  }
} satisfies Theme
