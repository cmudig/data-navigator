// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

// Import our custom components
import Example from './components/Example.vue'
import LiveExample from './components/LiveExample.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp({ app, router, siteData }) {
    // Register global components so they can be used in markdown
    app.component('Example', Example)
    app.component('LiveExample', LiveExample)
  }
} satisfies Theme
