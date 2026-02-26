# Getting Started

## Installation

```bash
npm install data-navigator @data-navigator/bokeh-wrapper
```

Also import the text-chat stylesheet — this styles the default navigation interface:

```js
import 'data-navigator/text-chat.css';
```

Or via a `<link>` tag if you prefer:

```html
<link rel="stylesheet" href="https://unpkg.com/data-navigator/text-chat.css" />
```

---

## Minimal example

Render your Bokeh chart first, then call `addDataNavigator`:

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';

const myData = [
  { fruit: 'Apples',      count: 5 },
  { fruit: 'Pears',       count: 3 },
  { fruit: 'Nectarines',  count: 4 },
  { fruit: 'Plums',       count: 2 },
  { fruit: 'Grapes',      count: 4 },
  { fruit: 'Strawberries', count: 6 },
];

// Render Bokeh chart into #my-plot first, then:
const wrapper = addDataNavigator({
  plotContainer: '#my-plot',
  data: myData,
});
```

The wrapper automatically:
- Infers the chart type (`bar` in this case)
- Builds a navigable structure
- Appends a text-chat interface after the plot
- Sets the Bokeh plot to `inert` so assistive technologies skip the inaccessible output

---

## Options reference

```ts
addDataNavigator({
  // Required ──────────────────────────────────────────────

  plotContainer: '#my-plot',   // CSS selector or HTMLElement
  data: myData,                // Array of plain objects (same data passed to Bokeh)

  // Chart type (optional — auto-detected from data shape) ─

  type: 'bar',
  // 'bar' | 'hbar' | 'scatter' | 'line' | 'multiline' | 'stacked_bar' | 'auto'

  // Field mappings (optional) ─────────────────────────────

  xField: 'fruit',    // Categorical or x-axis field
  yField: 'count',    // Numerical or y-axis field
  groupField: 'year', // Series / stack layer field (multiline, stacked_bar)

  // Interface mode (default: 'text') ──────────────────────

  mode: 'text',       // 'text' | 'keyboard' | 'both'

  // Place the chat UI somewhere specific (optional) ───────
  chatContainer: '#my-chat-area',

  // Sync with the Bokeh chart (optional) ──────────────────

  onNavigate(node) {
    // Called on every navigation move.
    // node.data contains the underlying datum.
    // Use this to redraw focus indicators, update tooltips, etc.
    highlightBar(node.data);
  },

  onExit() {
    clearHighlight();
  },

  // Interaction callbacks (text mode) ─────────────────────

  onClick(node) {
    // Called when user types "click" or "select".
    // Dispatch a programmatic click on the Bokeh element.
    triggerBokehClick(node.data);
  },

  onHover(node) {
    // Called when user types "hover" or "inspect".
    triggerBokehHover(node.data);
  },

  // LLM integration (optional) ────────────────────────────

  llm: async (messages) => {
    const res = await fetch('/api/llm', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
    const json = await res.json();
    return json.content;
  },

  // Override auto-generated command labels ────────────────

  commandLabels: {
    left: 'Previous fruit',
    right: 'Next fruit',
  },

  // Advanced: pass extra options to the structure builder ─

  structureOptions: {
    // Any StructureOptions from data-navigator
  },
});
```

---

## Returned instance

```ts
const wrapper = addDataNavigator({ ... });

// Get the currently focused node (or null)
wrapper.getCurrentNode();

// The underlying data-navigator Structure (pass to Inspector, etc.)
wrapper.structure;

// Remove all DOM additions and restore the plot
wrapper.destroy();
```

---

## Connecting to Bokeh

The most common use of `onNavigate` is to redraw a focus indicator on the Bokeh canvas when the user navigates to a new node. This pattern, and why, is unpacked in more detail in [Data Navigator's Getting Started guide](https://dig.cmu.edu/data-navigator/getting-started/first-chart.html#trouble-with-focus-indication), where a Bokeh chart is used as an example.

Because Bokeh renders to a `<canvas>`, the cleanest way to show focus is to redraw the chart with an extra highlight layer:

```js
const drawChart = (highlight) => {
  // Re-render Bokeh plot, adding a highlight layer if highlight !== null
};

const wrapper = addDataNavigator({
  plotContainer: '#my-plot',
  data,
  xField: 'fruit',
  yField: 'count',
  onNavigate(node) {
    if (!node.derivedNode) {
      // Leaf node — highlight this bar
      drawChart({ x: node.data.fruit });
    } else {
      drawChart(null);
    }
  },
  onExit() {
    drawChart(null);
  },
});
```

See the [examples](/examples/bar-chart) for complete, runnable code.

---

## Using with the Inspector

Pass `wrapper.structure` to `@data-navigator/inspector` to visualise the navigation graph:

```js
import { Inspector } from '@data-navigator/inspector';

const wrapper = addDataNavigator({ plotContainer: '#plot', data });

const inspector = Inspector({
  structure: wrapper.structure,
  container: 'inspector-container',
  size: 300,
  colorBy: 'dimensionLevel',
});

// Highlight inspector node when user navigates
wrapper.onNavigate = (node) => inspector.highlight(node.renderId ?? node.id);
```

::: warning Note
`onNavigate` is set at construction time. To wire up the inspector after the fact, pass `onNavigate` in the initial options or use the `structure` to build a fresh `input` handler.
:::

See the [Using the Inspector](/examples/with-inspector) example for a complete setup.

---

## Keyboard mode

Set `mode: 'keyboard'` to replace the text-chat UI with keyboard navigation that responds to arrow keys:

```js
addDataNavigator({
  plotContainer: '#my-plot',
  data,
  mode: 'keyboard',
  onNavigate(node) {
    // Sync the Bokeh chart on each navigation
    drawFocusIndicator(node.data);
  },
});
```

Use `mode: 'both'` to show the text-chat interface **and** keyboard navigation at the same time — useful for demo pages or when serving a mixed audience.

---

## Next steps

- Browse the [Examples](/examples/bar-chart) to see complete working charts
- Read the [Data Navigator getting-started guide](https://dig.cmu.edu/data-navigator/getting-started/) to understand the underlying structure, input, and rendering modules
- Check out the [Bokeh Accessibility Audit](https://bokeh-a11y-audit.readthedocs.io/) to understand known accessibility issues in Bokeh itself
