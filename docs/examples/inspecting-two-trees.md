# Inspecting Two Trees

This example extends [Using the Inspector](/examples/using-the-inspector) by showing the same structure in two different inspector modes: a **force-directed graph** and a **tree layout**. The force graph uses physics simulation to position nodes — useful for seeing connectivity, but non-deterministic. The tree layout arranges nodes in a fixed hierarchy — dimension nodes at top, divisions underneath, and leaf data points at the bottom.

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

## Chart + Two Inspectors

Press the **Enter navigation area** button in the chart area below, then use arrow keys to navigate. Both inspectors highlight simultaneously — compare how the same position in the structure looks in each layout.

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h3>Bar Chart</h3>
        <div id="tree-chart-area" style="position: relative;"></div>
    </div>
    <div>
        <h3>Force Graph</h3>
        <div id="tree-force-inspector" style="min-height: 300px;"></div>
    </div>
    <div>
        <h3>Tree Layout</h3>
        <div id="tree-tree-inspector" style="min-height: 300px;"></div>
    </div>
</div>

### Force vs. Tree

The **force graph** positions nodes using a physics simulation. Connected nodes attract each other and unconnected nodes repel. This reveals the overall connectivity pattern and is much more compact but the exact layout changes dramatically depending on the data and structure used.

The **tree layout** uses a deterministic algorithm:
- **Dimension nodes** are placed along the top row
- **Division nodes** are grouped underneath their parent dimension
- **Leaf data points** are arranged at the bottom
- **Parent-child links** are drawn as solid lines; **sibling links** as dashed lines

The tree layout is especially useful for understanding hierarchical structures built by the [dimensions API](/examples/dimensions-api), since it visually mirrors the dimension → division → data point hierarchy. Downsides? It can get quite large! And it also often hides edges that overlap, since they might share alignment along an axis with other edges and nodes.

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
    const chartArea = document.getElementById('tree-chart-area');
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
        uniqueID: 'two-trees-bar-chart',
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

    // Create both inspectors — same structure, different modes
    const inspectorOpts = {
        structure,
        size: 250,
        colorBy: 'dimensionLevel',
        edgeExclusions: ['any-exit'],
        nodeInclusions: ['exit']
    };

    const forceInspector = Inspector({
        ...inspectorOpts,
        container: 'tree-force-inspector',
        mode: 'force'
    });

    const treeInspector = Inspector({
        ...inspectorOpts,
        container: 'tree-tree-inspector',
        mode: 'tree'
    });

    // Set up data-navigator rendering
    let current = null;
    let previous = null;

    const enter = () => {
        const nextNode = input.enter();
        if (nextNode) initiateLifecycle(nextNode);
    };

    const rendering = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-node' },
        suffixId: 'two-trees-example',
        root: {
            id: 'tree-chart-area',
            description: 'Simple data structure with categorical and numerical dimensions.',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: enter } },
        exitElement: { include: true }
    });
    rendering.initialize();

    const updateChartHighlight = node => {
        if (!node.derivedNode) {
            barChart.clickHighlight = [{ id: node.data.id }];
            barChart.interactionKeys = ['id'];
        } else if (node.data?.dimensionKey) {
            barChart.clickHighlight = [{ selectAll: 'yes' }];
            barChart.interactionKeys = ['selectAll'];
        } else {
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
        forceInspector.clear();
        treeInspector.clear();
        clearChartHighlight();
    };

    const input = dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint,
        exitPoint: rendering.exitElement?.id
    });

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
            forceInspector.highlight(nextNode.renderId);
            treeInspector.highlight(nextNode.renderId);
            updateChartHighlight(nextNode);
        });

        element.addEventListener('blur', () => {
            forceInspector.clear();
            treeInspector.clear();
        });

        input.focus(nextNode.renderId);
        previous = current;
        current = nextNode.id;
    };
});
</script>

## The Complete Code

This code is designed to work **without a bundler**. Run `npm install data-navigator @data-navigator/inspector`, copy the files into a `src/` directory, and open `index.html` in your browser. The HTML uses an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) to resolve bare module specifiers, and loads the Visa bar chart component and D3 from CDNs.

If you're using a bundler (Vite, Webpack, etc.), you can simplify the imports to `import dataNavigator from 'data-navigator'` and `import { Inspector, buildLabel } from '@data-navigator/inspector'`, and remove the import map and CDN script tags from the HTML.

The key difference from the [Using the Inspector](/examples/using-the-inspector) example is that we create **two** `Inspector` instances from the same structure — one with `mode: 'force'` and one with `mode: 'tree'`. Both are highlighted and cleared simultaneously during navigation.

::: code-group

```js [coordinator.js]
import { structure, entryPoint, data } from './structure.js';
import { createChart, updateChartHighlight, clearChartHighlight } from './chart.js';
import { createInput } from './input.js';
import { Inspector, buildLabel } from '@data-navigator/inspector';
import dataNavigator from 'data-navigator';

// Assumes the page has:
//   <div id="chart-area" style="position: relative;"></div>
//   <div id="force-inspector"></div>
//   <div id="tree-inspector"></div>

let current = null;
let previous = null;
let input;
let exitHandler = null;

// Create the Visa bar chart
const barChart = createChart('chart-area', data);

// Create both inspectors — same structure, different modes
const inspectorOpts = {
    structure,
    size: 250,
    colorBy: 'dimensionLevel',
    edgeExclusions: ['any-exit'],
    nodeInclusions: ['exit']
};

const forceInspector = Inspector({
    ...inspectorOpts,
    container: 'force-inspector',
    mode: 'force'
});

const treeInspector = Inspector({
    ...inspectorOpts,
    container: 'tree-inspector',
    mode: 'tree'
});

function enter() {
    const nextNode = input.enter();
    if (nextNode) initiateLifecycle(nextNode);
}

const rendering = dataNavigator.rendering({
    elementData: structure.nodes,
    defaults: { cssClass: 'dn-node' },
    suffixId: 'two-trees-example',
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
    forceInspector.clear();
    treeInspector.clear();
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
        forceInspector.highlight(nextNode.renderId);
        treeInspector.highlight(nextNode.renderId);
        updateChartHighlight(barChart, nextNode);
    });

    element.addEventListener('blur', () => {
        forceInspector.clear();
        treeInspector.clear();
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
        uniqueID: 'two-trees-bar-chart',
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
        barChart.clickHighlight = [{ id: node.data.id }];
        barChart.interactionKeys = ['id'];
    } else if (node.data?.dimensionKey) {
        barChart.clickHighlight = [{ selectAll: 'yes' }];
        barChart.interactionKeys = ['selectAll'];
    } else {
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
                "data-navigator": "./node_modules/data-navigator/dist/index.js",
                "@data-navigator/inspector": "./node_modules/@data-navigator/inspector/src/inspector.js",
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
                <h3>Force Graph</h3>
                <div id="force-inspector" style="min-height: 350px;"></div>
            </div>
            <div>
                <h3>Tree Layout</h3>
                <div id="tree-inspector" style="min-height: 350px;"></div>
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

You can also find this example as a ready-to-run project on [GitHub](https://github.com/cmudig/data-navigator/tree/main/assets/inspecting-two-trees).
