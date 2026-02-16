# First Navigable Chart

Let's put everything together!

## The Final Result

<Example id="chart" height="420px" label="Fruit cost by store. Navigable stacked bar chart." />

**Try it out:**

1. Click "Enter navigation area" (or tab and press <kbd>Enter</kbd>)
2. Use <kbd>←</kbd> and <kbd>→</kbd> arrow keys to navigate
3. Press <kbd>Escape</kbd> to exit

<script setup>
import { onMounted, onUnmounted } from 'vue'

let cleanup = null

onMounted(async () => {
  const waitFor = (check, timeout = 5000) => new Promise((resolve, reject) => {
    const start = Date.now()
    const poll = () => {
      if (check()) resolve()
      else if (Date.now() - start > timeout) reject(new Error('Timeout'))
      else setTimeout(poll, 50)
    }
    poll()
  })

  try {
    await waitFor(() => typeof Bokeh !== 'undefined' && Bokeh.Plotting)
    await waitFor(() => document.getElementById('chart'))

    // ============================================
    // Bokeh Chart with Focus Indicator Support
    // ============================================
    
    const chartWidth = 300
    const chartHeight = 300
    
    // Data for programmatically drawing focus outlines
    const interactiveData = {
      data: [
        [[3, 2.75], [0, 0]],      // apple: [top values], [bottom values]
        [[3.75, 4], [3, 2.75]]    // banana: [top values], [bottom values]
      ],
      indices: {
        fruit: { apple: 0, banana: 1 },
        store: { a: 0, b: 1 }
      }
    }
    
    // Function to draw Bokeh chart with optional focus indicator
    const drawChart = (focusData) => {
      const container = document.getElementById('chart')
      container.innerHTML = ''
      
      const stores = ['a', 'b']
      const plt = Bokeh.Plotting
      const p = plt.figure({
        x_range: stores, y_range: [0, 5.5], 
        height: chartHeight, width: chartWidth,
        title: 'Fruit cost by store', output_backend: 'svg',
        toolbar_location: null, tools: ''
      })
      
      // Apple bars (bottom)
      p.vbar({ x: stores, top: [3, 2.75], bottom: [0, 0], width: 0.8, 
               color: '#FCB5B6', line_color: '#8F0002' })
      // Banana bars (stacked on top)
      p.vbar({ x: stores, top: [3.75, 4], bottom: [3, 2.75], width: 0.8, 
               color: '#F9E782', line_color: '#766500' })
      
      // Draw focus indicator outline if provided
      if (focusData) {
        p.vbar({
          x: stores,
          top: focusData.top,
          bottom: focusData.bottom,
          width: 0.8,
          line_width: 3,
          color: ['transparent', 'transparent'],
          line_color: focusData.line_color
        })
      }
      
      // Legend
      const r1 = p.square([-10000], [-10000], { color: '#FCB5B6', line_color: '#8F0002' })
      const r2 = p.square([-10000], [-10000], { color: '#F9E782', line_color: '#766500' })
      p.add_layout(new Bokeh.Legend({
        items: [
          new Bokeh.LegendItem({ label: 'apple', renderers: [r1] }),
          new Bokeh.LegendItem({ label: 'banana', renderers: [r2] })
        ],
        location: 'top_left', orientation: 'horizontal'
      }))
      
      plt.show(p, '#chart')
      
      // Hide Bokeh's inaccessible elements from AT
      const bokehPlot = document.querySelector('#chart')
      if (bokehPlot) bokehPlot.setAttribute('inert', 'true')
    }
    
    // Initial chart draw (no focus)
    drawChart(null)

    // ============================================
    // Import Data Navigator
    // ============================================
    
    const { default: dataNavigator } = await import('data-navigator')

    // ============================================
    // Define Structure with spatialProperties
    // ============================================
    
    let exitHandler = null
    
    const structure = {
      nodes: {
        _0: { 
          id: '_0', renderId: '_0', 
          data: { fruit: 'apple', store: 'a', cost: 3 },
          edges: ['_0-_1', 'any-exit'], 
          semantics: { label: 'fruit: apple. store: a. cost: 3. Data point.' },
          // Cover entire chart - focus indicator drawn by Bokeh
          spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        },
        _1: { 
          id: '_1', renderId: '_1', 
          data: { fruit: 'banana', store: 'a', cost: 0.75 },
          edges: ['_0-_1', '_1-_2', 'any-exit'], 
          semantics: { label: 'fruit: banana. store: a. cost: 0.75. Data point.' },
          spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        },
        _2: { 
          id: '_2', renderId: '_2', 
          data: { fruit: 'apple', store: 'b', cost: 2.75 },
          edges: ['_1-_2', '_2-_3', 'any-exit'], 
          semantics: { label: 'fruit: apple. store: b. cost: 2.75. Data point.' },
          spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        },
        _3: { 
          id: '_3', renderId: '_3', 
          data: { fruit: 'banana', store: 'b', cost: 1.25 },
          edges: ['_2-_3', 'any-exit'], 
          semantics: { label: 'fruit: banana. store: b. cost: 1.25. Data point.' },
          spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        }
      },
      edges: {
        '_0-_1': { source: '_0', target: '_1', navigationRules: ['left', 'right'] },
        '_1-_2': { source: '_1', target: '_2', navigationRules: ['left', 'right'] },
        '_2-_3': { source: '_2', target: '_3', navigationRules: ['left', 'right'] },
        'any-exit': { 
          source: (d, c) => c, 
          target: () => { if (exitHandler) exitHandler(); return '' }, 
          navigationRules: ['exit'] 
        }
      },
      navigationRules: {
        left: { key: 'ArrowLeft', direction: 'source' },
        right: { key: 'ArrowRight', direction: 'target' },
        exit: { key: 'Escape', direction: 'target' }
      }
    }

    // ============================================
    // State & Tooltip
    // ============================================
    
    let current = null, previous = null
    
    const showTooltip = (node) => {
      const tooltip = document.getElementById('chart-tooltip')
      if (tooltip && node.semantics?.label) {
        tooltip.textContent = node.semantics.label
        tooltip.classList.remove('hidden')
        // Position tooltip to the right of the chart
        tooltip.style.transform = `translate(${chartWidth + 10}px, ${chartHeight / 2 - 20}px)`
      }
    }
    
    const hideTooltip = () => {
      const tooltip = document.getElementById('chart-tooltip')
      if (tooltip) tooltip.classList.add('hidden')
    }
    
    // Draw focus indicator on the Bokeh chart
    const drawFocusIndicator = (node) => {
      if (!node?.data) return
      
      const fruitIndex = interactiveData.indices.fruit[node.data.fruit]
      const storeIndex = interactiveData.indices.store[node.data.store]
      const barData = interactiveData.data[fruitIndex]
      
      // line_color array: [store_a_color, store_b_color]
      const line_color = storeIndex === 0 ? ['#000000', 'transparent'] : ['transparent', '#000000']
      
      drawChart({
        top: barData[0],
        bottom: barData[1],
        line_color
      })
    }

    // ============================================
    // Create Renderer
    // ============================================
    
    const enter = () => {
      const nextNode = input.enter()
      if (nextNode) initiateLifecycle(nextNode)
    }
    
    const renderer = dataNavigator.rendering({
      elementData: structure.nodes,
      defaults: { cssClass: 'dn-manual-focus-node' },  // Transparent overlay
      suffixId: 'fruit-chart',
      root: { 
        id: 'chart-wrapper', 
        description: 'Fruit cost by store chart. Use arrow keys to navigate.', 
        width: '100%', 
        height: 0 
      },
      entryButton: { include: true, callbacks: { click: enter } },
      exitElement: { include: true }
    })
    renderer.initialize()

    exitHandler = () => {
      renderer.exitElement.style.display = 'block'
      input.focus(renderer.exitElement.id)
      if (current) { 
        renderer.remove(current)
        current = null 
      }
      hideTooltip()
      drawChart(null)  // Remove focus indicator
    }

    // ============================================
    // Create Input Handler
    // ============================================
    
    const input = dataNavigator.input({
      structure, 
      navigationRules: structure.navigationRules,
      entryPoint: '_0', 
      exitPoint: renderer.exitElement?.id
    })

    // ============================================
    // Navigation Lifecycle
    // ============================================
    
    const move = (direction) => {
      const nextNode = input.move(current, direction)
      if (nextNode) initiateLifecycle(nextNode)
    }
    
    const initiateLifecycle = (nextNode) => {
      if (previous) renderer.remove(previous)
      
      const element = renderer.render({ renderId: nextNode.renderId, datum: nextNode })
      
      element.addEventListener('keydown', (e) => {
        const direction = input.keydownValidator(e)
        if (direction) { e.preventDefault(); move(direction) }
      })
      
      element.addEventListener('focus', () => {
        showTooltip(nextNode)
        drawFocusIndicator(nextNode)  // Redraw chart with outline
      })
      
      element.addEventListener('blur', () => {
        hideTooltip()
      })
      
      input.focus(nextNode.renderId)
      previous = current
      current = nextNode.id
    }

    cleanup = () => { if (renderer) renderer.clearStructure() }
  } catch (e) {
    console.error('Failed to initialize:', e)
    const container = document.getElementById('chart')
    if (container) {
      container.innerHTML = `<p style="color: var(--vp-c-danger-1);">Error: ${e.message}</p>`
    }
  }
})

onUnmounted(() => { if (cleanup) cleanup() })
</script>

## Trouble with Focus Indication

You may have noticed something important: the focus indicator is drawn _by Bokeh_, not by Data Navigator's rendered element. This is because Bokeh renders to `<canvas>` — pure pixels with no DOM elements to position over.

::: warning The Challenge with Canvas/Pixel Rendering
Most visualization libraries don't expose element coordinates. This means you can't position a DOM focus indicator precisely over a specific bar or point. The workaround is:

1. Position the Data Navigator element to cover the **entire chart**
2. Draw the focus indicator **programmatically** using the visualization library itself
   :::

This is why accessibility support from visualization libraries themselves is so important. Ideally, Bokeh (and others) would make charts navigable by default. But if they did, they wouldn't need Data Navigator! So the next-best thing would be to have a way to "query" the location of rendered elements on-demand, given a known datum or id as input. (Here's hoping the major charting libraries out there add this feature!)

## The Complete Code

The code below is designed to work **without a bundler** — just `npm install data-navigator`, copy the files, and open `index.html` in your browser. That's why the import paths point directly to `../node_modules/data-navigator/dist/index.mjs`.

If you're using a bundler (Vite, Webpack, Rollup, etc.), you can simplify those imports to:

```js
import dataNavigator from 'data-navigator';
```

::: code-group

```js [coordinator.js]
import { structure, callbacks } from './structure.js';
import { drawChart, drawFocusIndicator, createRenderer } from './rendering.js';
import { createInput } from './input.js';

// Assumes the page has two container elements:
//   <div id="chart-wrapper">
//      <div id="chart"></div> (Bokeh renders the visual chart here)
//      ... (Data Navigator builds its accessible layering here)
//   </div>

// Track the currently focused and previously focused node IDs
// so we can clean up old elements as the user navigates.
let current = null;
let previous = null;

// The input handler is created after the renderer (because it
// needs the exit element's ID), so we declare it with `let`.
let input;

// Called when the user clicks the "Enter navigation area" button.
function enter() {
    const nextNode = input.enter();
    if (nextNode) initiateLifecycle(nextNode);
}

// Create the accessible HTML layer (Data Navigator rendering module).
const renderer = createRenderer(structure, enter);

// Create the keyboard handler (Data Navigator input module).
input = createInput(structure, renderer.exitElement?.id);

// Wire the exit callback: pressing Escape cleans up the current
// node and moves focus to the exit element.
callbacks.onExit = () => {
    renderer.exitElement.style.display = 'block';
    input.focus(renderer.exitElement.id);
    if (current) {
        renderer.remove(current);
        current = null;
    }
    drawChart(null); // Redraw chart without focus indicator
};

// Draw the Bokeh chart (no focus indicator initially).
drawChart(null);

// Given a direction string ('left', 'right', or 'exit'),
// resolve the next node and kick off the render cycle.
function move(direction) {
    const nextNode = input.move(current, direction);
    if (nextNode) initiateLifecycle(nextNode);
}

// Core lifecycle: tear down the old element, create a new
// accessible element, attach keyboard + focus listeners,
// and move focus to it.
function initiateLifecycle(nextNode) {
    if (previous) renderer.remove(previous);

    // render() creates a <figure> with ARIA attributes that
    // assistive technology can announce.
    const element = renderer.render({
        renderId: nextNode.renderId,
        datum: nextNode
    });

    // Arrow keys and Escape navigate the graph.
    element.addEventListener('keydown', e => {
        const direction = input.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            move(direction);
        }
    });

    // When this element receives focus, redraw the Bokeh chart
    // with a bold outline on the matching bar segment.
    element.addEventListener('focus', () => {
        drawFocusIndicator(nextNode);
    });

    input.focus(nextNode.renderId);
    previous = current;
    current = nextNode.id;
}
```

```js [structure.js]
// Chart pixel dimensions — also used as spatialProperties
// so Data Navigator knows each node's rendered area.
export const chartWidth = 300;
export const chartHeight = 300;

// Lookup table for drawing focus outlines on the correct bar.
// Each entry in `data` is [topValues, bottomValues] per store.
export const interactiveData = {
    data: [
        [
            [3, 2.75],
            [0, 0]
        ], // apple: tops=[3, 2.75], bottoms=[0, 0]
        [
            [3.75, 4],
            [3, 2.75]
        ] // banana: tops=[3.75, 4], bottoms=[3, 2.75]
    ],
    indices: {
        fruit: { apple: 0, banana: 1 },
        store: { a: 0, b: 1 }
    }
};

// Mutable callback reference. The coordinator assigns the real
// exit handler once the renderer is ready.
export const callbacks = { onExit: null };

// The navigable graph: 4 data points in a linked list.
//
//   [_0] ←→ [_1] ←→ [_2] ←→ [_3]
//   apple/a  banana/a  apple/b  banana/b
//
export const structure = {
    nodes: {
        _0: {
            id: '_0',
            renderId: '_0',
            data: { fruit: 'apple', store: 'a', cost: 3 },
            edges: ['_0-_1', 'any-exit'],
            semantics: { label: 'fruit: apple. store: a. cost: 3. Data point.' },
            spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        },
        _1: {
            id: '_1',
            renderId: '_1',
            data: { fruit: 'banana', store: 'a', cost: 0.75 },
            edges: ['_0-_1', '_1-_2', 'any-exit'],
            semantics: { label: 'fruit: banana. store: a. cost: 0.75. Data point.' },
            spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        },
        _2: {
            id: '_2',
            renderId: '_2',
            data: { fruit: 'apple', store: 'b', cost: 2.75 },
            edges: ['_1-_2', '_2-_3', 'any-exit'],
            semantics: { label: 'fruit: apple. store: b. cost: 2.75. Data point.' },
            spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        },
        _3: {
            id: '_3',
            renderId: '_3',
            data: { fruit: 'banana', store: 'b', cost: 1.25 },
            edges: ['_2-_3', 'any-exit'],
            semantics: { label: 'fruit: banana. store: b. cost: 1.25. Data point.' },
            spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        }
    },

    edges: {
        // Left/right arrows move between adjacent data points.
        '_0-_1': { source: '_0', target: '_1', navigationRules: ['left', 'right'] },
        '_1-_2': { source: '_1', target: '_2', navigationRules: ['left', 'right'] },
        '_2-_3': { source: '_2', target: '_3', navigationRules: ['left', 'right'] },
        // Escape exits from any node. The source function returns
        // the current node; the target function triggers the exit.
        'any-exit': {
            source: (d, c) => c,
            target: () => {
                if (callbacks.onExit) callbacks.onExit();
                return '';
            },
            navigationRules: ['exit']
        }
    },

    navigationRules: {
        left: { key: 'ArrowLeft', direction: 'source' },
        right: { key: 'ArrowRight', direction: 'target' },
        exit: { key: 'Escape', direction: 'target' }
    }
};
```

```js [rendering.js]
import dataNavigator from '../node_modules/data-navigator/dist/index.mjs';
import { chartWidth, chartHeight, interactiveData } from './structure.js';

// ---- Bokeh Chart ----

// Draws (or redraws) the stacked bar chart.
// Pass `focusData` to add a thick outline around one bar,
// or `null` to draw without any focus indicator.
export function drawChart(focusData) {
    const container = document.getElementById('chart');
    container.innerHTML = '';

    const stores = ['a', 'b'];
    const p = Bokeh.Plotting.figure({
        x_range: stores,
        y_range: [0, 5.5],
        height: chartHeight,
        width: chartWidth,
        title: 'Fruit cost by store',
        output_backend: 'svg',
        toolbar_location: null,
        tools: ''
    });

    // Apple bars (bottom layer)
    p.vbar({
        x: stores,
        top: [3, 2.75],
        bottom: [0, 0],
        width: 0.8,
        color: '#FCB5B6',
        line_color: '#8F0002'
    });
    // Banana bars (stacked on top of apple)
    p.vbar({
        x: stores,
        top: [3.75, 4],
        bottom: [3, 2.75],
        width: 0.8,
        color: '#F9E782',
        line_color: '#766500'
    });

    // Focus indicator: a transparent bar with a thick black border
    if (focusData) {
        p.vbar({
            x: stores,
            top: focusData.top,
            bottom: focusData.bottom,
            width: 0.8,
            line_width: 3,
            color: ['transparent', 'transparent'],
            line_color: focusData.line_color
        });
    }

    // Legend
    const r1 = p.square([-10000], [-10000], {
        color: '#FCB5B6',
        line_color: '#8F0002'
    });
    const r2 = p.square([-10000], [-10000], {
        color: '#F9E782',
        line_color: '#766500'
    });
    p.add_layout(
        new Bokeh.Legend({
            items: [
                new Bokeh.LegendItem({ label: 'apple', renderers: [r1] }),
                new Bokeh.LegendItem({ label: 'banana', renderers: [r2] })
            ],
            location: 'top_left',
            orientation: 'horizontal'
        })
    );

    Bokeh.Plotting.show(p, '#chart');

    // Bokeh's canvas elements are inaccessible — hide them from
    // assistive technology so they don't interfere with our layer.
    const bokehPlot = document.querySelector('#chart');
    if (bokehPlot) bokehPlot.setAttribute('inert', 'true');
}

// ---- Focus Indicator ----

// Redraws the chart with a black outline on the bar that
// matches the given node's fruit and store.
export function drawFocusIndicator(node) {
    if (!node?.data) return;

    const fruitIndex = interactiveData.indices.fruit[node.data.fruit];
    const storeIndex = interactiveData.indices.store[node.data.store];
    const barData = interactiveData.data[fruitIndex];

    // Only outline the bar for the focused store.
    const line_color = storeIndex === 0 ? ['#000000', 'transparent'] : ['transparent', '#000000'];

    drawChart({ top: barData[0], bottom: barData[1], line_color });
}

// ---- Data Navigator Renderer ----

// Creates the accessible HTML layer: entry button, navigable
// elements, and exit element.
export function createRenderer(structure, onEnter) {
    const renderer = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-manual-focus-node' },
        suffixId: 'fruit-chart',
        root: {
            id: 'chart-wrapper',
            description: 'Fruit cost by store chart. Use arrow keys to navigate.',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: onEnter } },
        exitElement: { include: true }
    });
    renderer.initialize();
    return renderer;
}
```

```js [input.js]
import dataNavigator from '../node_modules/data-navigator/dist/index.mjs';

// Creates the input handler, which maps keyboard events to
// graph traversal. Returns methods for entering, exiting,
// moving, and focusing nodes.
export function createInput(structure, exitPointId) {
    return dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint: '_0',
        exitPoint: exitPointId
    });
}
```

```html [index.html]
<html>
    <head>
        <link rel="stylesheet" href="./src/style.css" />
    </head>
    <body>
        <div id="chart-wrapper">
            <div id="chart"></div>
        </div>
    </body>
    <script src="https://cdn.bokeh.org/bokeh/release/bokeh-3.7.3.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.bokeh.org/bokeh/release/bokeh-gl-3.7.3.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.bokeh.org/bokeh/release/bokeh-widgets-3.7.3.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.bokeh.org/bokeh/release/bokeh-tables-3.7.3.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.bokeh.org/bokeh/release/bokeh-api-3.7.3.min.js" crossorigin="anonymous"></script>
    <script type="module" src="./src/coordinator.js"></script>
</html>
```

```css [style.css]
/* The rendered node covers the whole chart area but should
   be invisible — the focus indicator is drawn by Bokeh. */
.dn-manual-focus-node {
    pointer-events: none;
    background: transparent;
    border: none;
    position: absolute;
    margin: 0px;
}

/* The browser's native focus outline still appears around
   the chart area, providing a visible focus indicator. */
.dn-manual-focus-node:focus {
    outline: 2px solid #1e3369;
}
```

:::

## Key Takeaways

::: tip spatialProperties for Focus Indication
Every node needs `spatialProperties` with `x`, `y`, `width`, `height`. For canvas-based charts where you can't position over specific elements, cover the entire chart and draw the indicator programmatically using your charting library (like we did with Bokeh here).
:::

::: tip Render On Demand
We still only render one node at a time, keeping the DOM clean.
:::

## Next Steps

Congratulations! You've built your first accessible, navigable chart. Explore the [Examples](/examples/) for more patterns, including SVG-based charts where element positioning _is_ possible.
