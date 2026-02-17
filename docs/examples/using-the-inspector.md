# Using the Inspector

The [Data Navigator Inspector](https://dig.cmu.edu/data-navigator/inspector/) is a passive visualization tool that draws a data-navigator `structure` object as a force-directed node-edge graph. As you navigate through a chart, the inspector's focus indicator follows your position in the graph. This makes it useful for debugging and understanding the structure you've built.

## Keyboard Controls

<button class="toggle-controls" :aria-expanded="showControls" @click="showControls = !showControls">{{ showControls ? 'Hide controls' : 'Show controls' }}</button>

<div v-show="showControls">

| Command                        | Key                                         |
| ------------------------------ | ------------------------------------------- |
| Enter the structure            | Activate the "Enter navigation area" button |
| Exit                           | <kbd>Esc</kbd>                              |
| Left (backward along category) | <kbd>←</kbd>                                |
| Right (forward along category) | <kbd>→</kbd>                                |
| Up (backward along metric)     | <kbd>↑</kbd>                                |
| Down (forward along metric)    | <kbd>↓</kbd>                                |
| Drill down to child            | <kbd>Enter</kbd>                            |
| Drill up to parent             | <kbd>W</kbd> or <kbd>J</kbd>                |

</div>

## Chart + Inspector

Press the **Enter navigation area** button in the chart area below, then use arrow keys, enter, and W/J keys to navigate. Watch the focus indicator move through the inspector graph on the right.

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h3>Bar Chart</h3>
        <div id="chart-area" style="position: relative;"></div>
    </div>
    <div>
        <h3>Structure Inspector</h3>
        <div id="simple-inspector" style="min-height: 350px;"></div>
    </div>
</div>

### How Navigation Works

This chart has two dimensions: a **categorical** dimension (`cat`) and a **numerical** dimension (`num`). Each dimension creates a different way to move through the data.

**Numerical dimension (up/down).** Pressing <kbd>Enter</kbd> from the `num` dimension drills down into data points sorted from lowest to highest value. Use <kbd>↑</kbd> and <kbd>↓</kbd> to move between data points in order of their numerical value. Since this dimension uses `terminal` extents, movement stops at the first and last values.

**Categorical dimension (left/right).** Pressing <kbd>Enter</kbd> from the `cat` dimension drills down into divisions grouped by category. One group ("bork") contains a single data point while the other ("meow") contains three. Use <kbd>←</kbd> and <kbd>→</kbd> to move between divisions. Since this dimension uses `circular` extents, movement wraps around from the last division back to the first. If you navigate to the `"bork"` child, since it is alone, <kbd>←</kbd> and <kbd>→</kbd> will have no effect (because there are no siblings that also have the same category).

**At the child-most level,** all four arrow keys are available regardless of which dimension you drilled down from. <kbd>←</kbd> and <kbd>→</kbd> move across the categorical dimension while <kbd>↑</kbd> and <kbd>↓</kbd> move across the numerical dimension. This means you can freely explore data points in any direction once you reach the bottom of this dual-hierarchy. Press <kbd>W</kbd> or <kbd>J</kbd> to drill back up to a parent.

<script setup>
import { ref, onMounted } from 'vue';

const showControls = ref(true);

onMounted(async () => {
    const { default: dataNavigator } = await import('data-navigator');
    const { Inspector, buildLabel } = await import('data-navigator-inspector');

    const data = [
        { id: 'a', cat: 'meow', num: 3, selectAll: 'yes' },
        { id: 'b', cat: 'meow', num: 1, selectAll: 'yes' },
        { id: 'c', cat: 'meow', num: 2, selectAll: 'yes' },
        { id: 'd', cat: 'bork', num: 4, selectAll: 'yes' }
    ];

    // Create the Visa bar chart
    const chartArea = document.getElementById('chart-area');
    const barChart = document.createElement('bar-chart');
    const barProps = {
        mainTitle: '',
        subTitle: '',
        data,
        height: 200,
        width: 250,
        padding: { top: 10, bottom: 35, right: 10, left: 30 },
        colors: ['#DDD', '#999999'],
        ordinalAccessor: 'id',
        valueAccessor: 'num',
        groupAccessor: 'cat',
        sortOrder: 'asc',
        uniqueID: 'examples-bar-chart',
        dataLabel: { visible: false },
        clickHighlight: [],
        clickStyle: { color: '#222', strokeWidth: 1 },
        interactionKeys: [],
        yAxis: { visible: false, gridVisible: false },
        xAxis: { visible: true },
        suppressEvents: true,
        layout: 'vertical',
        accessibility: {
            elementsAreInterface: false,
            disableValidation: true,
            hideDataTableButton: true,
            keyboardNavConfig: { disabled: true },
            hideTextures: true,
            hideStrokes: false
        }
    };
    Object.keys(barProps).forEach(prop => {
        barChart[prop] = barProps[prop];
    });
    chartArea.appendChild(barChart);

    let exitHandler = null;

    const structure = dataNavigator.structure({
        data,
        idKey: 'id',
        dimensions: {
            values: [
                {
                    dimensionKey: 'cat',
                    type: 'categorical',
                    behavior: { extents: 'circular' }
                },
                {
                    dimensionKey: 'num',
                    type: 'numerical',
                    behavior: { extents: 'terminal' }
                }
            ]
        },
        genericEdges: [
            {
                edgeId: 'any-exit',
                edge: {
                    source: (_d, c) => c,
                    target: () => {
                        if (exitHandler) exitHandler();
                        return '';
                    },
                    navigationRules: ['exit']
                }
            }
        ]
    });

    const entryPoint = structure.dimensions[Object.keys(structure.dimensions)[0]].nodeId;

    // 1. Create the inspector (passive — just draws the force graph)
    const inspector = Inspector({
        structure,
        container: 'simple-inspector',
        size: 250,
        colorBy: 'dimensionLevel',
        edgeExclusions: ['any-exit'],
        nodeInclusions: ['exit']
    });

    // 2. Set up data-navigator rendering on the chart area
    let current = null;
    let previous = null;

    const enter = () => {
        const nextNode = input.enter();
        if (nextNode) initiateLifecycle(nextNode);
    };

    const rendering = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-node' },
        suffixId: 'inspector-example',
        root: {
            id: 'chart-area',
            description: 'Simple data structure with categorical and numerical dimensions.',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: enter } },
        exitElement: { include: true }
    });
    rendering.initialize();

    // Update chart highlight based on the current node
    const updateChartHighlight = node => {
        if (!node.derivedNode) {
            // Leaf node — highlight specific bar
            barChart.clickHighlight = [{ id: node.data.id }];
            barChart.interactionKeys = ['id'];
        } else if (node.data?.dimensionKey) {
            // Dimension node — highlight all bars
            barChart.clickHighlight = [{ selectAll: 'yes' }];
            barChart.interactionKeys = ['selectAll'];
        } else {
            // Division node — highlight group
            const key = node.derivedNode;
            const value = node.data?.[key];
            barChart.clickHighlight = [{ [key]: value }];
            barChart.interactionKeys = [key];
        }
    };

    const clearChartHighlight = () => {
        barChart.clickHighlight = [];
    };

    exitHandler = () => {
        rendering.exitElement.style.display = 'block';
        input.focus(rendering.exitElement.id);
        if (current) {
            rendering.remove(current);
            current = null;
        }
        inspector.clear();
        clearChartHighlight();
    };

    // 3. Set up input handler
    const input = dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint,
        exitPoint: rendering.exitElement?.id
    });

    // 4. Navigation lifecycle — update inspector on focus/blur
    const move = direction => {
        const nextNode = input.move(current, direction);
        if (nextNode) initiateLifecycle(nextNode);
    };

    const initiateLifecycle = nextNode => {
        if (!nextNode.renderId) {
            nextNode.renderId = nextNode.id;
        }
        if (!nextNode.spatialProperties) {
            nextNode.spatialProperties = { x: 0, y: 25, width: 250, height: 225 };
        }
        if (!nextNode.semantics?.label) {
            nextNode.semantics = { ...nextNode.semantics, label: buildLabel(nextNode) };
        }
        if (previous) rendering.remove(previous);

        const element = rendering.render({
            renderId: nextNode.renderId,
            datum: nextNode
        });

        element.addEventListener('keydown', e => {
            const direction = input.keydownValidator(e);
            if (direction) {
                e.preventDefault();
                move(direction);
            }
        });

        element.addEventListener('focus', () => {
            inspector.highlight(nextNode.renderId);
            updateChartHighlight(nextNode);
        });

        element.addEventListener('blur', () => {
            inspector.clear();
        });

        input.focus(nextNode.renderId);
        previous = current;
        current = nextNode.id;
    };
});
</script>

### About The Inspector

The inspector is a separate package (`data-navigator-inspector`) that you can install alongside data-navigator. It draws a force-directed graph of your structure's nodes and edges, making the abstract navigation graph visible.

The inspector is **passive** — it doesn't drive navigation. You set up data-navigator's rendering and input modules on your chart as normal, then call `inspector.highlight(nodeId)` and `inspector.clear()` from your navigation lifecycle's focus and blur handlers.

See the [Inspector documentation](https://dig.cmu.edu/data-navigator/inspector/) for installation and API details.

## The Complete Code

This code is designed to work **without a bundler**. Run `npm install data-navigator data-navigator-inspector`, copy the files into a `src/` directory, and open `index.html` in your browser. The HTML uses an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) to resolve bare module specifiers, and loads the Visa bar chart component and D3 from CDNs.

If you're using a bundler (Vite, Webpack, etc.), you can simplify the imports to `import dataNavigator from 'data-navigator'` and `import { Inspector, buildLabel } from 'data-navigator-inspector'`, and remove the import map and CDN script tags from the HTML.

The structure is generated by the **dimensions API** — you describe two dimensions (`cat` and `num`) and Data Navigator automatically builds a multi-level hierarchy. `coordinator.js` wires everything together. `chart.js` creates the Visa bar chart and provides highlight functions. `structure.js` defines the data and generates the navigable graph via the dimensions API. `input.js` creates the keyboard handler.

::: code-group

```js [coordinator.js]
import { structure, entryPoint, data } from './structure.js';
import { createChart, updateChartHighlight, clearChartHighlight } from './chart.js';
import { createInput } from './input.js';
import { Inspector, buildLabel } from 'data-navigator-inspector';
import dataNavigator from 'data-navigator';

// Assumes the page has:
//   <div id="chart-area" style="position: relative;"></div>
//   <div id="inspector"></div>

let current = null;
let previous = null;
let input;
let exitHandler = null;

// Create the Visa bar chart
const barChart = createChart('chart-area', data);

// Create the inspector (passive — just visualizes the structure)
const inspector = Inspector({
    structure,
    container: 'inspector',
    size: 250,
    colorBy: 'dimensionLevel',
    edgeExclusions: ['any-exit'],
    nodeInclusions: ['exit']
});

function enter() {
    const nextNode = input.enter();
    if (nextNode) initiateLifecycle(nextNode);
}

const rendering = dataNavigator.rendering({
    elementData: structure.nodes,
    defaults: { cssClass: 'dn-node' },
    suffixId: 'inspector-example',
    root: {
        id: 'chart-area',
        description: 'Simple data structure with categorical and numerical dimensions.',
        width: '100%',
        height: 0
    },
    entryButton: { include: true, callbacks: { click: enter } },
    exitElement: { include: true }
});
rendering.initialize();

exitHandler = () => {
    rendering.exitElement.style.display = 'block';
    input.focus(rendering.exitElement.id);
    if (current) {
        rendering.remove(current);
        current = null;
    }
    inspector.clear();
    clearChartHighlight(barChart);
};

input = createInput(structure, entryPoint, rendering.exitElement?.id);

function move(direction) {
    const nextNode = input.move(current, direction);
    if (nextNode) initiateLifecycle(nextNode);
}

function initiateLifecycle(nextNode) {
    if (!nextNode.renderId) {
        nextNode.renderId = nextNode.id;
    }
    if (!nextNode.spatialProperties) {
        nextNode.spatialProperties = { x: 0, y: 25, width: 250, height: 225 };
    }
    if (!nextNode.semantics?.label) {
        nextNode.semantics = { ...nextNode.semantics, label: buildLabel(nextNode) };
    }
    if (previous) rendering.remove(previous);

    const element = rendering.render({
        renderId: nextNode.renderId,
        datum: nextNode
    });

    element.addEventListener('keydown', e => {
        const direction = input.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            move(direction);
        }
    });

    element.addEventListener('focus', () => {
        inspector.highlight(nextNode.renderId);
        updateChartHighlight(barChart, nextNode);
    });

    element.addEventListener('blur', () => {
        inspector.clear();
    });

    input.focus(nextNode.renderId);
    previous = current;
    current = nextNode.id;
}
```

```js [structure.js]
import dataNavigator from 'data-navigator';

export const data = [
    { id: 'a', cat: 'meow', num: 3, selectAll: 'yes' },
    { id: 'b', cat: 'meow', num: 1, selectAll: 'yes' },
    { id: 'c', cat: 'meow', num: 2, selectAll: 'yes' },
    { id: 'd', cat: 'bork', num: 4, selectAll: 'yes' }
];

// The dimensions API automatically builds a multi-level hierarchy.
// 'cat' (categorical) creates divisions grouped by category.
// 'num' (numerical) sorts data points by value.
export const structure = dataNavigator.structure({
    data,
    idKey: 'id',
    dimensions: {
        values: [
            {
                dimensionKey: 'cat',
                type: 'categorical',
                behavior: { extents: 'circular' }
            },
            {
                dimensionKey: 'num',
                type: 'numerical',
                behavior: { extents: 'terminal' }
            }
        ]
    },
    genericEdges: [
        {
            edgeId: 'any-exit',
            edge: {
                source: (_d, c) => c,
                target: () => '',
                navigationRules: ['exit']
            }
        }
    ]
});

export const entryPoint = structure.dimensions[
    Object.keys(structure.dimensions)[0]
].nodeId;
```

```js [chart.js]
// Creates a Visa bar chart web component inside the given container.
export function createChart(containerId, data) {
    const chartArea = document.getElementById(containerId);
    const barChart = document.createElement('bar-chart');
    const props = {
        mainTitle: '',
        subTitle: '',
        data,
        height: 200,
        width: 250,
        padding: { top: 10, bottom: 35, right: 10, left: 30 },
        colors: ['#DDD', '#999999'],
        ordinalAccessor: 'id',
        valueAccessor: 'num',
        groupAccessor: 'cat',
        sortOrder: 'asc',
        uniqueID: 'inspector-bar-chart',
        dataLabel: { visible: false },
        clickHighlight: [],
        clickStyle: { color: '#222', strokeWidth: 1 },
        interactionKeys: [],
        yAxis: { visible: false, gridVisible: false },
        xAxis: { visible: true },
        suppressEvents: true,
        layout: 'vertical',
        accessibility: {
            elementsAreInterface: false,
            disableValidation: true,
            hideDataTableButton: true,
            keyboardNavConfig: { disabled: true },
            hideTextures: true,
            hideStrokes: false
        }
    };
    Object.keys(props).forEach(prop => {
        barChart[prop] = props[prop];
    });
    chartArea.appendChild(barChart);
    return barChart;
}

// Highlights bars on the chart based on the current node type.
export function updateChartHighlight(barChart, node) {
    if (!node.derivedNode) {
        // Leaf node — highlight specific bar
        barChart.clickHighlight = [{ id: node.data.id }];
        barChart.interactionKeys = ['id'];
    } else if (node.data?.dimensionKey) {
        // Dimension node — highlight all bars
        barChart.clickHighlight = [{ selectAll: 'yes' }];
        barChart.interactionKeys = ['selectAll'];
    } else {
        // Division node — highlight group
        const key = node.derivedNode;
        const value = node.data?.[key];
        barChart.clickHighlight = [{ [key]: value }];
        barChart.interactionKeys = [key];
    }
}

export function clearChartHighlight(barChart) {
    barChart.clickHighlight = [];
}
```

```js [input.js]
import dataNavigator from 'data-navigator';

export function createInput(structure, entryPoint, exitPointId) {
    return dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint,
        exitPoint: exitPointId
    });
}
```

```html [index.html]
<html>
    <head>
        <link rel="stylesheet" href="./src/style.css" />
        <script type="importmap">
        {
            "imports": {
                "data-navigator": "./node_modules/data-navigator/dist/index.mjs",
                "data-navigator-inspector": "./node_modules/data-navigator-inspector/src/inspector.js",
                "d3-array": "https://cdn.jsdelivr.net/npm/d3-array@3/+esm",
                "d3-drag": "https://cdn.jsdelivr.net/npm/d3-drag@3/+esm",
                "d3-force": "https://cdn.jsdelivr.net/npm/d3-force@3/+esm",
                "d3-scale": "https://cdn.jsdelivr.net/npm/d3-scale@4/+esm",
                "d3-scale-chromatic": "https://cdn.jsdelivr.net/npm/d3-scale-chromatic@3/+esm",
                "d3-selection": "https://cdn.jsdelivr.net/npm/d3-selection@3/+esm"
            }
        }
        </script>
    </head>
    <body>
        <div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
            <div>
                <h3>Bar Chart</h3>
                <div id="chart-area" style="position: relative;"></div>
            </div>
            <div>
                <h3>Structure Inspector</h3>
                <div id="inspector" style="min-height: 350px;"></div>
            </div>
        </div>
    </body>
    <script src="https://unpkg.com/@visa/bar-chart@7/dist/bar-chart/bar-chart.esm.js" type="module"></script>
    <script type="module" src="./src/coordinator.js"></script>
</html>
```

```css [style.css]
.dn-node {
    pointer-events: none;
    background: transparent;
    border: none;
    position: absolute;
    margin: 0;
}

.dn-node:focus {
    outline: 2px solid #1e3369;
}
```

:::

You can also find this example as a ready-to-run project on [GitHub](https://github.com/cmudig/data-navigator/tree/main/assets/using-the-inspector).
