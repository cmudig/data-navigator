---
layout: home

hero:
    name: 'Bokeh Wrapper'
    text: 'Accessible data navigation for Bokeh charts'
    tagline: One function call. Smart defaults. Works with screen readers, keyboard, and more.
    actions:
        - theme: brand
          text: Get Started
          link: /getting-started
        - theme: alt
          text: View Examples
          link: /examples/bar-chart

features:
    - title: Simple API
      details: Pass your plot container and data — the wrapper infers chart type, builds a navigable structure, and adds a text-chat interface automatically.
    - title: Text-chat by default
      details: The text menu lets users type navigation commands in plain language, making charts accessible without requiring keyboard focus or special hardware.
    - title: Keyboard mode available
      details: Enable keyboard-first navigation with mode&#58; 'keyboard' for users who prefer arrow-key or focus-based navigation. Both modes can run simultaneously.
    - title: LLM-ready
      details: Plug in any LLM to let users ask natural-language questions about the data alongside structured navigation.
    - title: Built on data-navigator
      details: A thin, opinionated wrapper over the core data-navigator library. Every option is escapable — advanced users have full access to the underlying API.
    - title: Inspector compatible
      details: Pass the returned `structure` directly to @data-navigator/inspector to visualize the navigation graph while building or debugging.
---

## What this is

`@data-navigator/bokeh-wrapper` makes it easy to add accessible data navigation to any [Bokeh](https://bokeh.org/) chart. It is part of the [Data Navigator](https://dig.cmu.edu/data-navigator/) project.

Bokeh charts are visually rich but historically inaccessible — assistive technologies can't meaningfully interact with the canvas or SVG output. This wrapper builds a parallel accessible interface that lets users navigate the underlying data directly.

::: tip Bokeh Accessibility Audit
This project is informed by the ongoing [Bokeh Accessibility Audit](https://bokeh-a11y-audit.readthedocs.io/), which documents and tracks accessibility issues in Bokeh. The audit is a separate project — check it out if you want to understand the problem space more deeply.
:::

## Quick Start

```bash
npm install data-navigator @data-navigator/bokeh-wrapper
```

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';
import 'data-navigator/text-chat.css';

// After your Bokeh chart is rendered:
const wrapper = addDataNavigator({
  plotContainer: '#my-plot',
  data: myData,
});
```

That's it. The wrapper will:
1. Set the Bokeh plot to `inert` so screen readers skip the inaccessible output
2. Infer the chart type from your data
3. Build a navigable graph structure
4. Append a text-chat interface after the plot

## Data Navigator

This package is part of the [Data Navigator](https://dig.cmu.edu/data-navigator/) ecosystem. If you are building a custom integration or want lower-level control, the [core library](https://dig.cmu.edu/data-navigator/getting-started/) and [Inspector](https://dig.cmu.edu/data-navigator/inspector/) are available separately.
