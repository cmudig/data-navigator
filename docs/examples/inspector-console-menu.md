# Inspector Console Menu

This example extends [Inspecting Force/Tree](/examples/inspecting-force-tree) by adding the inspector's **console menu** — an interactive text-based panel for inspecting nodes, edges, and navigation rules. Instead of showing both graph modes simultaneously, a toggle button lets you switch between **force** and **tree** layouts while the console menu stays attached. For full console menu documentation, see the [Inspector docs](https://dig.cmu.edu/data-navigator/inspector/examples/console-menu).

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

## Chart + Inspector + Console Menu

Press the **Enter navigation area** button in the chart area below, then use arrow keys to navigate. The inspector graph highlights the current node, and the console menu lets you interactively inspect any node or edge.

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h3>Bar Chart</h3>
        <div id="menu-chart-area" style="position: relative;"></div>
    </div>
    <div>
        <h3>Inspector ({{ graphMode === 'tree' ? 'Tree' : 'Force' }}) + Console Menu</h3>
        <button class="toggle-controls" :aria-expanded="graphMode === 'tree'" @click="toggleGraphMode">{{ graphMode === 'tree' ? 'Switch to force graph' : 'Switch to tree graph' }}</button>
        <div id="menu-inspector" style="min-height: 300px;"></div>
    </div>
</div>

### How to Use the Console Menu

The console menu appears below the graph as a collapsible **Inspector Menu** panel. It contains three sections:

- **Console** — Logged items appear here when you click "log" buttons on nodes or edges. Console entries are also interactive: you can check or hover them to highlight the corresponding graph elements.
- **Rendered Elements** — Lists all nodes (grouped by dimension and division) and edges (grouped by navigation rule). Each item has a checkbox and a "log" button.
- **Source Input** — Shows the raw data and structure configuration used to build the graph.

**Checking** any item highlights it in the graph: other elements dim to 50% opacity while the checked item gets a dark stroke. Multiple items can be checked at once. **Group checkboxes** on headings select or deselect all items in that group.

**Hovering** a menu item moves the focus indicator to the corresponding node, or thickens the corresponding edge.

**Virtual edges** (like the "exit" edge in this example) are not normally drawn because they connect to many nodes and would add visual noise. When you select one in the menu, the inspector draws those edges dynamically.

<script setup>
import { ref, onMounted } from 'vue';

const showControls = ref(true);
const graphMode = ref('tree');

let rebuildInspector = null;
const toggleGraphMode = () => {
    graphMode.value = graphMode.value === 'tree' ? 'force' : 'tree';
    if (rebuildInspector) rebuildInspector(graphMode.value);
};

onMounted(async () => {
    const { default: dataNavigator } = await import('data-navigator');
    const { Inspector, buildLabel } = await import('data-navigator-inspector');

    const data = [
        { id: 'a', cat: 'meow', num: 3, selectAll: 'yes' },
        { id: 'b', cat: 'meow', num: 1, selectAll: 'yes' },
        { id: 'c', cat: 'meow', num: 2, selectAll: 'yes' },
        { id: 'd', cat: 'bork', num: 4, selectAll: 'yes' }
    ];

    const chartArea = document.getElementById('menu-chart-area');
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
        uniqueID: 'console-menu-bar-chart',
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

    const structureOptions = {
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
    };

    const structure = dataNavigator.structure(structureOptions);
    const entryPoint = structure.dimensions[Object.keys(structure.dimensions)[0]].nodeId;

    // Create inspector with console menu — toggleable between tree and force
    const inspectorContainer = document.getElementById('menu-inspector');
    let inspector = null;

    function createInspector(mode) {
        if (inspector) inspector.destroy();
        return Inspector({
            structure,
            container: inspectorContainer,
            size: 250,
            colorBy: 'dimensionLevel',
            edgeExclusions: ['any-exit'],
            nodeInclusions: ['exit'],
            mode,
            showConsoleMenu: {
                data,
                structure: structureOptions
            }
        });
    }

    inspector = createInspector(graphMode.value);

    rebuildInspector = (mode) => {
        inspector = createInspector(mode);
    };

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
        suffixId: 'console-menu-example',
        root: {
            id: 'menu-chart-area',
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
        inspector.clear();
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

## The Complete Code

This code is designed to work **without a bundler**. Run `npm install data-navigator @data-navigator/inspector`, copy the files into a `src/` directory, and open `index.html` in your browser. The HTML uses an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) to resolve bare module specifiers, and loads the Visa bar chart component and D3 from CDNs.

If you're using a bundler (Vite, Webpack, etc.), you can simplify the imports to `import dataNavigator from 'data-navigator'` and `import { Inspector, buildLabel } from '@data-navigator/inspector'`, and remove the import map and CDN script tags from the HTML.

The key difference from the [Inspecting Force/Tree](/examples/inspecting-force-tree) example is that instead of creating two inspectors, we create **one** with `showConsoleMenu` enabled and a toggle to switch its `mode` between `'force'` and `'tree'`. The `createInspector()` function destroys and recreates the inspector when the mode changes.

::: code-group

```js [coordinator.js]
import { structure, structureOptions, entryPoint, data } from './structure.js';
import { createChart, updateChartHighlight, clearChartHighlight } from './chart.js';
import { createInput } from './input.js';
import { Inspector, buildLabel } from '@data-navigator/inspector';
import dataNavigator from 'data-navigator';

// Assumes the page has:
//   <div id="chart-area" style="position: relative;"></div>
//   <div id="inspector-area" style="min-height: 300px;"></div>
//   <button id="mode-toggle">Switch to force graph</button>

let current = null;
let previous = null;
let input;
let exitHandler = null;
let inspector = null;
let currentMode = 'tree';

// Create the Visa bar chart
const barChart = createChart('chart-area', data);

// Create the inspector with console menu
function createInspector(mode) {
    if (inspector) inspector.destroy();
    inspector = Inspector({
        structure,
        container: 'inspector-area',
        size: 250,
        colorBy: 'dimensionLevel',
        edgeExclusions: ['any-exit'],
        nodeInclusions: ['exit'],
        mode,
        showConsoleMenu: {
            data,
            structure: structureOptions
        }
    });
    return inspector;
}

createInspector(currentMode);

// Wire up the mode toggle button
const toggleBtn = document.getElementById('mode-toggle');
toggleBtn.addEventListener('click', () => {
    currentMode = currentMode === 'tree' ? 'force' : 'tree';
    createInspector(currentMode);
    toggleBtn.textContent = currentMode === 'tree'
        ? 'Switch to force graph'
        : 'Switch to tree graph';
});

function enter() {
    const nextNode = input.enter();
    if (nextNode) initiateLifecycle(nextNode);
}

const rendering = dataNavigator.rendering({
    elementData: structure.nodes,
    defaults: { cssClass: 'dn-node' },
    suffixId: 'console-menu-example',
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

export const structureOptions = {
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
};

export const structure = dataNavigator.structure(structureOptions);

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
        uniqueID: 'console-menu-bar-chart',
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
        <link rel="stylesheet" href="./node_modules/@data-navigator/inspector/style.css" />
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
                <h3>Inspector + Console Menu</h3>
                <button id="mode-toggle">Switch to force graph</button>
                <div id="inspector-area" style="min-height: 300px;"></div>
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

You can also find this example as a ready-to-run project on [GitHub](https://github.com/cmudig/data-navigator/tree/main/assets/inspector-console-menu).
