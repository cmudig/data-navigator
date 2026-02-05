---
layout: home
title: Data Navigator
titleTemplate: Accessible Data Navigation

hero:
  name: Data Navigator
  text: Accessible Data Navigation
  tagline: A JavaScript library that enables keyboard, screen reader, and multi-modal navigation of data structures and visualizations.
  image:
    src: /logo.svg
    alt: Data Navigator
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/cmudig/data-navigator

features:
  - icon: 🏗️
    title: Rich Navigable Structures
    details: Build list, tree, spatial, or graph-based navigation structures that make sense for your data.
  - icon: ⌨️
    title: Multi-Modal Input
    details: Support keyboard, touch, voice, gesture, and custom input modalities through a unified command system.
  - icon: 🎯
    title: Semantic Rendering
    details: Render accessible HTML overlays on top of any visualization—SVG, Canvas, images, or WebGL.
  - icon: 🔧
    title: Framework Agnostic
    details: Works with any visualization library (D3, Vega, Bokeh, Chart.js, etc.) and any web framework.
---

## Why Data Navigator?

Modern data visualization accessibility faces three key challenges:

1. **Structure is hard** — Navigable structure is essential for understanding but often ignored.
2. **Input is limited** — Only mouse input is well-supported, leaving keyboard and assistive technology users behind.
3. **Semantics are missing** — Visualizations are often rendered as semantic-less pixels, invisible to screen readers.

Data Navigator addresses all three by providing flexible infrastructure for building accessible data experiences.

## Quick Example

```js
import dataNavigator from 'data-navigator'

const structure = {
  nodes: { /* your data nodes */ },
  edges: { /* connections between nodes */ },
  navigationRules: { /* keyboard mappings */ }
}

const input = dataNavigator.input({ structure, entryPoint: 'node-1' })
const renderer = dataNavigator.rendering({ 
  elementData: structure.nodes,
  root: { id: 'my-chart-wrapper' }
})

renderer.initialize()
```

## Cite Our Work

```bibtex
@article{2023-elavsky-data-navigator,
  title = {{Data Navigator}: An Accessibility-Centered Data Navigation Toolkit},
  publisher = {{IEEE}},
  author = {Frank Elavsky and Lucas Nadolskis and Dominik Moritz},
  journal = {{IEEE} Transactions on Visualization and Computer Graphics},
  year = {2023},
  url = {http://dig.cmu.edu/data-navigator/}
}
```
