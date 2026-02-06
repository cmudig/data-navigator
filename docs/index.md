---
layout: home
title: Data Navigator
titleTemplate: Accessible Data Navigation

hero:
  name: Data Navigator
  text: Accessible Data Navigation
  tagline: A JavaScript library that enables keyboard, screen reader, and multi-modal navigation of data structures and visualizations.
  image:
    src: /data_navigator.png
    alt: Data Navigator provides visualization toolkits with rich, accessible navigation structures, robust input handling, and flexible, semantic rendering.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: Try the Demo
      link: /demo
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
    details: Render accessible HTML underlays for any visualization -> SVG, Canvas, images, or WebGL.
  - icon: 🔧
    title: Framework Agnostic
    details: Works with any visualization library (D3, Vega-lite, Bokeh, etc.) and any web framework (React, Svelte, Vue, etc.).
---

## What is Data Navigator?

Data Navigator enables designers and developers to render a semantic, navigable structure on top of any graphic. This structure can be used by a massive variety of different input modalities.

**Quick links:**
- [Get started building your first navigable data structure](/getting-started/)
- [Try the interactive demo](/demo) with keyboard, voice, gesture, and touch input
- [Read our accessible HTML paper](https://www.frank.computer/data-navigator/)
- [Explore the code on GitHub](https://github.com/cmudig/data-navigator)

## Introduction Video

An overview of what Data Navigator does, why we made it, and what we hope our system is used for:

<div style="position: relative; overflow: hidden; width: 100%; padding-top: 56.25%; margin: 2rem 0;">
  <iframe
    style="position: absolute; top: 0; left: 0; bottom: 0; right: 0; width: 100%; height: 100%;"
    src="https://www.youtube-nocookie.com/embed/-vl982QjVQ0?si=MXAb-VPHpAaLeVw6&cc_lang_pref=en&cc_load_policy=1"
    title="YouTube video player - Data Navigator Introduction"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</div>

## Why Data Navigator?

Modern data visualization accessibility faces 3 challenges in design and development that we wanted to help practitioners and researchers tackle:

1. **Navigable structure is hard to build** for data visualizations. Structure is important for understanding and usability but is often ignored.
2. **Only mouse input is treated well** (with sporadic support for touch or screen reader input). Many other input modalities are unaddressed!
3. **Visualizations are often rendered as semantic-less SVG or raster** (pngs, canvas, etc). If semantics are added at all they end up using low-level SVG, which is often not appropriate. Semantics help understanding and add functional interactivity.

## Advantages of Data Navigator

Data Navigator uses a **graph-based infrastructure**, comprised of nodes and edges. This allows us to do two really interesting things: create almost any other possible structure (list, hierarchy, spatial, network, etc) and prioritize direct relationships among data points. This underlying infrastructure is different from HTML's, which prioritizes hierarchies and not direct relationships.

It might seem like anarchy to design a low-level building block like this, but this is actually philosophically more empowering: designers and developers can add the structure and order that make the most sense for what they are doing, rather than try to make everything fit into a hierarchy.

Data Navigator allows designers and developers to express both **rich and unique structures** in ways that can handle making an entire library of charts more accessible or even take on unaddressed or bespoke visualizations.

And navigation of a structure can also be built to fit: Data Navigator abstracts **navigation rules into namespaces**, like "commands." Commands can be entirely customized to suit the needs of the structure they support. The advantage of this abstraction is that Data Navigator can be made to work with nearly any input modality as long as input is validated and converted into an existing command.

And lastly, Data Navigator can create an **accessible rendering layer** (using semantic HTML) on top of any existing visuals (or no visuals at all). This approach lets designers and developers fully control how navigation looks and feels for both screen readers and other input modalities without relying on whatever was used to render the original visualization (SVG, png, canvas, etc). This means that interactive elements in a visualization can be real "button" elements and not an SVG rectangle made from scratch to emulate a button.

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

## Resources

- **[Getting Started Guide](/getting-started/)** - Build your first navigable chart
- **[Interactive Demo](/demo)** - Try multi-modal input (keyboard, voice, gesture, touch)
- **[GitHub Repository](https://github.com/cmudig/data-navigator)** - Source code and issues
- **[npm Package](https://www.npmjs.com/package/data-navigator)** - Install Data Navigator
- **[Research Paper](https://www.frank.computer/data-navigator/)** - Read the full paper
