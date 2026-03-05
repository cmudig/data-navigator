# @data-navigator/bokeh-wrapper

Accessible data navigation for [Bokeh](https://bokeh.org/) charts. One function call adds a keyboard, screen reader, and text-chat navigation interface to any Bokeh chart.

Part of the [Data Navigator](https://dig.cmu.edu/data-navigator/) project.

**[Documentation](https://dig.cmu.edu/data-navigator/bokeh-wrapper/)** · **[Getting Started](https://dig.cmu.edu/data-navigator/bokeh-wrapper/getting-started)** · **[npm](https://www.npmjs.com/package/@data-navigator/bokeh-wrapper)**

## Install

```bash
npm install data-navigator @data-navigator/bokeh-wrapper
```

Also import the text-chat stylesheet:

```js
import 'data-navigator/text-chat.css';
```

## Quick start

Render your Bokeh chart first, then call `addDataNavigator`:

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';
import 'data-navigator/text-chat.css';

const wrapper = addDataNavigator({
    plotContainer: '#my-plot',
    data: myData
});
```

The wrapper automatically:

1. Sets the Bokeh plot to `inert` so screen readers skip the inaccessible canvas output
2. Infers the chart type from your data shape (you can also specify it)
3. Builds a navigable graph structure (the hard part!)
4. Appends a text-chat interface after the plot (this can be styled further using css)

## Options

```ts
addDataNavigator({
    // Required
    plotContainer: '#my-plot', // CSS selector or HTMLElement
    data: myData, // Array of plain objects (same data passed to Bokeh)

    // Chart type — auto-detected if omitted
    type: 'bar',
    // 'bar' | 'hbar' | 'scatter' | 'line' | 'multiline' | 'stacked_bar' | 'auto'

    // Field mappings — inferred from data if omitted
    xField: 'fruit', // Categorical or x-axis field
    yField: 'count', // Numerical or y-axis field
    groupField: 'year', // Series/stack layer field (multiline, stacked_bar)

    // Interface mode (default: 'text')
    mode: 'text', // 'text' | 'keyboard' | 'both'

    // Place the chat UI in a specific container (optional)
    chatContainer: '#my-chat-area',

    // Sync with the Bokeh chart
    onNavigate(node) {
        // Called on every navigation move — use to redraw focus indicators
        highlightBar(node.data);
    },
    onExit() {
        clearHighlight();
    },

    // Interaction callbacks (text mode)
    onClick(node) {
        // Triggered when user types "click" or "select"
        triggerBokehClick(node.data);
    },
    onHover(node) {
        // Triggered when user types "hover" or "inspect"
        triggerBokehHover(node.data);
    },

    // LLM integration (optional)
    llm: async messages => {
        const res = await fetch('/api/llm', { method: 'POST', body: JSON.stringify({ messages }) });
        return (await res.json()).content;
    },

    // Override auto-generated navigation command labels
    commandLabels: {
        left: 'Previous fruit',
        right: 'Next fruit'
    },

    // Advanced: pass extra options to the underlying data-navigator structure builder
    structureOptions: {}
});
```

## Returned instance

```ts
const wrapper = addDataNavigator({ ... });

wrapper.getCurrentNode();  // Currently focused node, or null
wrapper.structure;         // Underlying data-navigator Structure (pass to Inspector, etc.)
wrapper.destroy();         // Remove all DOM additions and restore the plot
```

## Connecting to Bokeh

Because Bokeh renders to a `<canvas>`, the cleanest way to show focus is to redraw the chart with an extra highlight layer on each navigation event. Bokeh also, unfortunately, makes it hard for Data Navigator to know where elements are rendered. This means that focus during navigation takes place on the whole visualization, while an indicator is added using bokeh to the specific location. This isn't ideal, but is the best approach we can take unless Bokeh adds some way to query element `x`, `y`, `width`, and `height` programmatically. We also [discuss the focus indication challenge further](https://dig.cmu.edu/data-navigator/getting-started/first-chart.html#trouble-with-focus-indication) in our core docs for Data Navigator.

```js
const drawChart = highlight => {
    /* re-render with highlight layer */
};

const wrapper = addDataNavigator({
    plotContainer: '#my-plot',
    data,
    onNavigate(node) {
        drawChart(node.derivedNode ? null : { x: node.data.fruit });
    },
    onExit() {
        drawChart(null);
    }
});
```

See the [Getting Started guide](https://dig.cmu.edu/data-navigator/bokeh-wrapper/getting-started) for the full walkthrough and [examples](https://dig.cmu.edu/data-navigator/bokeh-wrapper/examples/bar-chart) for complete runnable code.

## Using with the Inspector

Pass `wrapper.structure` to [`@data-navigator/inspector`](https://www.npmjs.com/package/@data-navigator/inspector) to visualize the navigation graph:

```js
import { Inspector } from '@data-navigator/inspector';

const wrapper = addDataNavigator({ plotContainer: '#plot', data });
const inspector = Inspector({ structure: wrapper.structure, container: 'inspector-container' });
```

## Background

Bokeh charts are visually rich but historically inaccessible — assistive technologies cannot meaningfully interact with the canvas or SVG output. This wrapper builds a parallel accessible interface using a bokeh visualization's underlying data. Our work is informed by the ongoing [Bokeh Accessibility Audit](https://bokeh-a11y-audit.readthedocs.io/), which documents accessibility issues in Bokeh. The audit and this package was supported by a [CZI Essential Open Source Software](https://chanzuckerberg.com/eoss/) (EOSS) Cycle 6 grant.

## Credit

Developed at CMU's [Data Interaction Group](https://dig.cmu.edu/) by [Frank Elavsky](https://frank.computer), in collaboration with Quansight, Anaconda, and Bokeh.

## Citing Data Navigator

```bib
@article{2023-data-navigator,
  title = {{Data Navigator}: An Accessibility-Centered Data Navigation Toolkit},
  publisher = {{IEEE}},
  author = {Frank Elavsky and Lucas Nadolskis and Dominik Moritz},
  journal = {{IEEE} Transactions on Visualization and Computer Graphics},
  year = {2023},
  url = {http://dig.cmu.edu/data-navigator/}
}
```
