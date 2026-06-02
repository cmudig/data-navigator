# Commands Instructions

This example shows how the rendering module can be used to automatically generate a commands instructions table for your data visualization. The commands can be explicitely set or generated from the navigations rules.

## Generation from navigation rules

<button class="toggle-controls" :aria-expanded="showControls" @click="showControls = !showControls">{{ showControls ? 'Hide controls' : 'Show controls' }}</button>

<div v-show="showControls">
    <div id="commands-root"></div>
</div>

<div>
    <h3>Bar Chart</h3>
    <div id="chart-wrapper" style="position: relative;">
        <div id="chart"></div>
    </div>
</div>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const showControls = ref(true);
let cleanup = null;

onMounted(async () => {
    const waitFor = (check, timeout = 5000) => new Promise((resolve, reject) => {
        const start = Date.now();
        const poll = () => {
            if (check()) resolve();
            else if (Date.now() - start > timeout) reject(new Error('Timeout'));
            else setTimeout(poll, 50);
        };
        poll();
    });

    try {
        await waitFor(() => typeof Bokeh !== 'undefined' && Bokeh.Plotting);
        await waitFor(() => document.getElementById('chart'));

        const { default: dataNavigator } = await import('data-navigator');

        const chartWidth = 300;
        const chartHeight = 300;

        // Data for programmatically drawing focus outlines
        const interactiveData = {
            data: [
                [[3, 2.75], [0, 0]],      // apple: [top values], [bottom values]
                [[3.75, 4], [3, 2.75]]     // banana: [top values], [bottom values]
            ],
            indices: {
                fruit: { apple: 0, banana: 1 },
                store: { a: 0, b: 1 }
            }
        };

        // Function to draw Bokeh chart with optional focus indicator
        const drawChart = (focusData) => {
            const container = document.getElementById('chart');
            container.innerHTML = '';

            const stores = ['a', 'b'];
            const plt = Bokeh.Plotting;
            const p = plt.figure({
                x_range: stores, y_range: [0, 5.5],
                height: chartHeight, width: chartWidth,
                title: 'Fruit cost by store', output_backend: 'svg',
                toolbar_location: null, tools: ''
            });

            // Apple bars (bottom)
            p.vbar({ x: stores, top: [3, 2.75], bottom: [0, 0], width: 0.8,
                     color: '#FCB5B6', line_color: '#8F0002' });
            // Banana bars (stacked on top)
            p.vbar({ x: stores, top: [3.75, 4], bottom: [3, 2.75], width: 0.8,
                     color: '#F9E782', line_color: '#766500' });

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
                });
            }

            // Legend
            const r1 = p.square([-10000], [-10000], { color: '#FCB5B6', line_color: '#8F0002' });
            const r2 = p.square([-10000], [-10000], { color: '#F9E782', line_color: '#766500' });
            p.add_layout(new Bokeh.Legend({
                items: [
                    new Bokeh.LegendItem({ label: 'apple', renderers: [r1] }),
                    new Bokeh.LegendItem({ label: 'banana', renderers: [r2] })
                ],
                location: 'top_left', orientation: 'horizontal'
            }));

            plt.show(p, '#chart');

            // Hide Bokeh's inaccessible elements from AT
            const bokehPlot = document.querySelector('#chart');
            if (bokehPlot) bokehPlot.setAttribute('inert', 'true');
        };

        // Initial chart draw (no focus)
        drawChart(null);

        // Define structure
        let exitHandler = null;

        const structure = {
            nodes: {
                _0: {
                    id: '_0', renderId: '_0',
                    data: { fruit: 'apple', store: 'a', cost: 3 },
                    edges: ['_0-_1', 'any-exit'],
                    semantics: { label: 'fruit: apple. store: a. cost: 3. Data point.' },
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
                    target: () => { if (exitHandler) exitHandler(); return ''; },
                    navigationRules: ['exit']
                }
            },
            navigationRules: {
                left: { key: 'ArrowLeft', direction: 'source' },
                right: { key: 'ArrowRight', direction: 'target' },
                exit: { key: 'Escape', direction: 'target' }
            }
        };

        // State
        let current = null;
        let previous = null;

        // Draw focus indicator on the Bokeh chart
        const drawFocusIndicator = (node) => {
            if (!node?.data) return;

            const fruitIndex = interactiveData.indices.fruit[node.data.fruit];
            const storeIndex = interactiveData.indices.store[node.data.store];
            const barData = interactiveData.data[fruitIndex];

            const line_color = storeIndex === 0 ? ['#000000', 'transparent'] : ['transparent', '#000000'];

            drawChart({
                top: barData[0],
                bottom: barData[1],
                line_color
            });
        };

        // Set up rendering
        const enter = () => {
            const nextNode = input.enter();
            if (nextNode) initiateLifecycle(nextNode);
        };

        const rendering = dataNavigator.rendering({
            elementData: structure.nodes,
            defaults: { cssClass: 'dn-manual-focus-node' },
            suffixId: 'simple-list',
            root: {
                id: 'chart-wrapper',
                description: 'Fruit cost by store chart. Use arrow keys to navigate.',
                width: '100%',
                height: 0
            },
            entryButton: { include: true, callbacks: { click: enter } },
            exitElement: { include: true },
            commandsElement: {
                include: true,
                rootId: 'commands-root',
                navigationRules: structure.navigationRules,
            },
        });

        rendering.initialize();

        exitHandler = () => {
            rendering.exitElement.style.display = 'block';
            input.focus(rendering.exitElement.id);
            if (current) {
                rendering.remove(current);
                current = null;
            }
            drawChart(null);
        };

        // Set up input handler
        const input = dataNavigator.input({
            structure,
            navigationRules: structure.navigationRules,
            entryPoint: '_0',
            exitPoint: rendering.exitElement?.id
        });

        // Navigation lifecycle
        const move = (direction) => {
            const nextNode = input.move(current, direction);
            if (nextNode) initiateLifecycle(nextNode);
        };

        const initiateLifecycle = (nextNode) => {
            if (previous) rendering.remove(previous);

            const element = rendering.render({ renderId: nextNode.renderId, datum: nextNode });

            element.addEventListener('keydown', (e) => {
                const direction = input.keydownValidator(e);
                if (direction) { e.preventDefault(); move(direction); }
            });

            element.addEventListener('focus', () => {
                drawFocusIndicator(nextNode);
            });

            input.focus(nextNode.renderId);
            previous = current;
            current = nextNode.id;
        };

        cleanup = () => { if (rendering) rendering.clearStructure(); };
    } catch (e) {
        console.error('Failed to initialize:', e);
        const container = document.getElementById('chart');
        if (container) {
            container.innerHTML = `<p style="color: var(--vp-c-danger-1);">Error: ${e.message}</p>`;
        }
    }
});

onUnmounted(() => { if (cleanup) cleanup(); });
</script>

### About This Example

This is the same chart and structure from the [Getting Started guide](/getting-started/first-chart), shown here with a command table above that was generated automatically by modifying the rendering options.

In this example, we specify a `commandsElement.rootId` in the rendering options that matches the id of the HTML node the table will be injected into. The command table content is deduced from the `navigationRules` that need to be passed to the rendering options.

If the `title` option is specified, it adds a `caption` HTML element as the first child of the table.

```js
const rendering = dataNavigator.rendering({
    ...
    commandsElement: {
        include: true,
        rootId: 'commands-root',
        title: 'Commands instructions',
        navigationRules: structure.navigationRules,
    },
});
```

### Modifying the list of commands

Letting the rendering module generate commands from navigation rules is not always exactly what we want. It is likely that all commands could not be deduced from the navigation rules, or that you would like to adapt the names given to the commands. That's why it's also possible to specify the list of commands explicitly as an array of `CommandObject`, or as a function of the array of generic `CommandObject` returning an array of `CommandObject`.

```js
const rendering = dataNavigator.rendering({
    ...
    commandsElement: {
        include: true,
        rootId: 'commands-root',
        commands: [
            { label: 'Activate the "Enter navigation area" button', description: 'Enter the structure' },
            { label: '→', description: 'Next data point' },
            { label: '←', description: 'Previous data point' },
            { label: 'Esc', description: 'Exit' }
        ]
    },
});
```

```js
const rendering = dataNavigator.rendering({
    ...
    commandsElement: {
        include: true,
        rootId: 'commands-root',
        commands: genericCommands => genericCommands.filter(c => c.label !== 'Esc'),
        navigationRules: structure.navigationRules,
    },
});
```

### More complex implementations

If you have a more complex setup, you may need more control over the insertion of the commands table in the DOM. For example if the `rootId` is not in the DOM when `dataNavigator.rendering` is called.

The commands instructions table is a custom element that is exported as `CommandsTable` from the rendering module. You can define it from your own script, set its parameters manually, and add the `commands-table` tag in your HTML template.

```javascript
customElements.define('commands-table', rendering.CommandsTable);
document.querySelector('commands-table').commands = [
    { label: 'Activate the "Enter navigation area" button', description: 'Enter the structure' },
    { label: '→', description: 'Next data point' },
    { label: '←', description: 'Previous data point' },
    { label: 'Esc', description: 'Exit' }
];
```

```html
<commands-table title="Commands instructions"></commands-table>
```

The util function `getGenericCommandsFromNavRules` is also exposed by the rendering module. It contains the logic behind the generation of generic commands from navigation rules.

## The Complete Code

This code is designed to work without a bundler. Run `npm install data-navigator`, copy the files into a `src/` directory, and open `index.html` in your browser.

::: code-group

```js [coordinator.js]
import { structure, callbacks } from './structure.js';
import { drawChart, drawFocusIndicator, createRenderer } from './rendering.js';
import { createInput } from './input.js';

let current = null;
let previous = null;
let input;

function enter() {
    const nextNode = input.enter();
    if (nextNode) initiateLifecycle(nextNode);
}

const renderer = createRenderer(structure, enter);
input = createInput(structure, renderer.exitElement?.id);

callbacks.onExit = () => {
    renderer.exitElement.style.display = 'block';
    input.focus(renderer.exitElement.id);
    if (current) {
        renderer.remove(current);
        current = null;
    }
    drawChart(null);
};

drawChart(null);

function move(direction) {
    const nextNode = input.move(current, direction);
    if (nextNode) initiateLifecycle(nextNode);
}

function initiateLifecycle(nextNode) {
    if (previous) renderer.remove(previous);

    const element = renderer.render({
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
        drawFocusIndicator(nextNode);
    });

    input.focus(nextNode.renderId);
    previous = current;
    current = nextNode.id;
}
```

```js [structure.js]
export const chartWidth = 300;
export const chartHeight = 300;

// Lookup table for drawing focus outlines on the correct bar.
export const interactiveData = {
    data: [
        [
            [3, 2.75],
            [0, 0]
        ], // apple: [topValues, bottomValues]
        [
            [3.75, 4],
            [3, 2.75]
        ] // banana: [topValues, bottomValues]
    ],
    indices: {
        fruit: { apple: 0, banana: 1 },
        store: { a: 0, b: 1 }
    }
};

export const callbacks = { onExit: null };

// A simple linked list: 4 data points connected by left/right edges.
//   [_0] ←→ [_1] ←→ [_2] ←→ [_3]
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
        '_0-_1': { source: '_0', target: '_1', navigationRules: ['left', 'right'] },
        '_1-_2': { source: '_1', target: '_2', navigationRules: ['left', 'right'] },
        '_2-_3': { source: '_2', target: '_3', navigationRules: ['left', 'right'] },
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
import dataNavigator from 'data-navigator';
import { chartWidth, chartHeight, interactiveData } from './structure.js';

// Draws the Bokeh chart. Pass focusData to add a thick outline
// around one bar, or null to draw without any indicator.
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

    p.vbar({ x: stores, top: [3, 2.75], bottom: [0, 0], width: 0.8, color: '#FCB5B6', line_color: '#8F0002' });
    p.vbar({ x: stores, top: [3.75, 4], bottom: [3, 2.75], width: 0.8, color: '#F9E782', line_color: '#766500' });

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

    const r1 = p.square([-10000], [-10000], { color: '#FCB5B6', line_color: '#8F0002' });
    const r2 = p.square([-10000], [-10000], { color: '#F9E782', line_color: '#766500' });
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
    const bokehPlot = document.querySelector('#chart');
    if (bokehPlot) bokehPlot.setAttribute('inert', 'true');
}

// Redraws the chart with a focus outline on the matching bar.
export function drawFocusIndicator(node) {
    if (!node?.data) return;
    const fruitIndex = interactiveData.indices.fruit[node.data.fruit];
    const storeIndex = interactiveData.indices.store[node.data.store];
    const barData = interactiveData.data[fruitIndex];
    const line_color = storeIndex === 0 ? ['#000000', 'transparent'] : ['transparent', '#000000'];
    drawChart({ top: barData[0], bottom: barData[1], line_color });
}

// Creates the accessible HTML layer.
export function createRenderer(structure, onEnter) {
    const renderer = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-manual-focus-node' },
        suffixId: 'simple-list',
        root: {
            id: 'chart-wrapper',
            description: 'Fruit cost by store chart. Use arrow keys to navigate.',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: onEnter } },
        exitElement: { include: true },
        commandsElement: {
            include: true,
            rootId: 'commands-root',
            commands: [
                {
                    label: 'Activate the "Enter navigation area" button',
                    description: 'Enter the structure'
                },
                { label: '→', description: 'Next data point' },
                { label: '←', description: 'Previous data point' },
                { label: 'Esc', description: 'Exit' }
            ]
        }
    });
    renderer.initialize();
    return renderer;
}
```

```js [input.js]
import dataNavigator from 'data-navigator';

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
        <script type="importmap">
            {
                "imports": {
                    "data-navigator": "./node_modules/data-navigator/dist/index.mjs"
                }
            }
        </script>
    </head>
    <body>
        <div>
            <h3>Bar Chart</h3>
            <div id="commands-root"></div>
            <div id="chart-wrapper">
                <div id="chart"></div>
            </div>
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
.dn-manual-focus-node {
    pointer-events: none;
    background: transparent;
    border: none;
    position: absolute;
    margin: 0px;
}

.dn-manual-focus-node:focus {
    outline: 2px solid #1e3369;
}
```

:::
