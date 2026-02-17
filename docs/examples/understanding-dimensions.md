# Understanding Dimensions

The dimensions API lets you describe the meaningful axes of your data and have Data Navigator automatically build a navigable hierarchy. This page walks through the core concepts using small, concrete examples — all based on the same simple fruit-cost dataset from the [Getting Started guide](/getting-started/first-chart).

## The Dataset

All examples on this page use this 4-item dataset:

```js
const data = [
    { id: '_0', fruit: 'apple',  store: 'a', cost: 3 },
    { id: '_1', fruit: 'banana', store: 'a', cost: 0.75 },
    { id: '_2', fruit: 'apple',  store: 'b', cost: 2.75 },
    { id: '_3', fruit: 'banana', store: 'b', cost: 1.25 }
];
```

## 1. Hand-Built List (No Dimensions)

The [first chart](/getting-started/first-chart) in the Getting Started guide creates a **flat linked list** by hand — no dimensions API at all. Each node is manually defined with explicit edges:

```js
const structure = {
    nodes: {
        _0: { id: '_0', data: { fruit: 'apple', store: 'a', cost: 3 },
              edges: ['_0-_1', 'any-exit'] },
        _1: { id: '_1', data: { fruit: 'banana', store: 'a', cost: 0.75 },
              edges: ['_0-_1', '_1-_2', 'any-exit'] },
        _2: { id: '_2', data: { fruit: 'apple', store: 'b', cost: 2.75 },
              edges: ['_1-_2', '_2-_3', 'any-exit'] },
        _3: { id: '_3', data: { fruit: 'banana', store: 'b', cost: 1.25 },
              edges: ['_2-_3', 'any-exit'] }
    },
    edges: {
        '_0-_1': { source: '_0', target: '_1', navigationRules: ['left', 'right'] },
        '_1-_2': { source: '_1', target: '_2', navigationRules: ['left', 'right'] },
        '_2-_3': { source: '_2', target: '_3', navigationRules: ['left', 'right'] },
        'any-exit': { source: (d, c) => c, target: () => '', navigationRules: ['exit'] }
    },
    navigationRules: {
        left: { key: 'ArrowLeft', direction: 'source' },
        right: { key: 'ArrowRight', direction: 'target' },
        exit: { key: 'Escape', direction: 'target' }
    }
};
```

This works, but you have to wire every node and edge yourself. The result is a simple chain: `_0 ↔ _1 ↔ _2 ↔ _3`. Navigate with <kbd>←</kbd> / <kbd>→</kbd>.

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h4>Chart</h4>
        <div id="ex1-chart-wrapper" style="position: relative;">
            <div id="ex1-chart"></div>
        </div>
    </div>
    <div>
        <h4>Inspector</h4>
        <div id="ex1-inspector" style="min-height: 250px;"></div>
    </div>
</div>

## 2. Two Categorical Dimensions (Store + Fruit)

Now let's use the dimensions API to make the same chart navigable with **two dimensions**: navigate by `store` with <kbd>←</kbd> / <kbd>→</kbd> and by `fruit` with <kbd>↑</kbd> / <kbd>↓</kbd>. This creates a dual hierarchy — dimension nodes at the top, division nodes underneath, and leaf data points at the bottom.

```js
const structure = dataNavigator.structure({
    data,
    idKey: 'id',
    dimensions: {
        values: [
            {
                dimensionKey: 'store',
                type: 'categorical',
                behavior: { extents: 'terminal', childmostNavigation: 'across' }
            },
            {
                dimensionKey: 'fruit',
                type: 'categorical',
                behavior: { extents: 'terminal', childmostNavigation: 'across' }
            }
        ]
    },
    genericEdges: [{ edgeId: 'any-exit', edge: {
        source: (_d, c) => c, target: () => '', navigationRules: ['exit']
    }}]
});
```

Drill down with <kbd>Enter</kbd>, drill up with <kbd>W</kbd> or <kbd>J</kbd>. At the leaf level, all four arrow keys work because both dimensions use `childmostNavigation: 'across'`.

::: tip Multiple navigable charts on one page
When you have several Data Navigator instances on the same page (especially with a shared dataset), each instance of Data Navigator must use **unique ids**. You may need to copy your datasets, to avoid sharing ids! If two structures share an id like `_0`, the rendered focus element from one chart can steal focus from another. This will throw users off, because they'll suddenly be moved to the wrong structure elsewhere when navigating. Either give each dataset its own id suffix (e.g. `_0_a`, `_0_b`) or make sure you remove all rendered elements when the user exits/blurs a chart (which is a less-accessible pattern than leaving the last-visited elements remaining rendered).
:::

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h4>Chart</h4>
        <div id="ex2-chart-wrapper" style="position: relative;">
            <div id="ex2-chart"></div>
        </div>
    </div>
    <div>
        <h4>Inspector <button class="toggle-controls" @click="ex2Tree = !ex2Tree">{{ ex2Tree ? 'Show force' : 'Show tree' }}</button></h4>
        <div v-show="!ex2Tree" id="ex2-force-inspector" style="min-height: 250px;"></div>
        <div v-show="ex2Tree" id="ex2-tree-inspector" style="min-height: 250px;"></div>
    </div>
</div>

## 3. Circular Extents

Change `extents: 'terminal'` to `extents: 'circular'` and navigation wraps around — moving right from store "b" loops back to store "a", and vice versa. Compare the inspector graph: notice the extra edges that connect the last division back to the first.

```js
{
    dimensionKey: 'store',
    type: 'categorical',
    behavior: { extents: 'circular', childmostNavigation: 'across' }
},
{
    dimensionKey: 'fruit',
    type: 'categorical',
    behavior: { extents: 'circular', childmostNavigation: 'across' }
}
```

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h4>Chart</h4>
        <div id="ex3-chart-wrapper" style="position: relative;">
            <div id="ex3-chart"></div>
        </div>
    </div>
    <div>
        <h4>Inspector <button class="toggle-controls" @click="ex3Tree = !ex3Tree">{{ ex3Tree ? 'Show force' : 'Show tree' }}</button></h4>
        <div v-show="!ex3Tree" id="ex3-force-inspector" style="min-height: 250px;"></div>
        <div v-show="ex3Tree" id="ex3-tree-inspector" style="min-height: 250px;"></div>
    </div>
</div>

## 4. Numerical Dimension (Sorted by Cost)

Use the `cost` field as a **numerical** dimension. Data points are sorted by their numerical value — lowest cost first — and you navigate through them in order with <kbd>←</kbd> / <kbd>→</kbd>.

```js
{
    dimensionKey: 'cost',
    type: 'numerical',
    behavior: { extents: 'terminal' }
}
```

Since the numerical dimension uses `terminal` extents, navigation stops at the cheapest and most expensive items.

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h4>Chart</h4>
        <div id="ex4-chart-wrapper" style="position: relative;">
            <div id="ex4-chart"></div>
        </div>
    </div>
    <div>
        <h4>Inspector <button class="toggle-controls" @click="ex4Tree = !ex4Tree">{{ ex4Tree ? 'Show force' : 'Show tree' }}</button></h4>
        <div v-show="!ex4Tree" id="ex4-force-inspector" style="min-height: 250px;"></div>
        <div v-show="ex4Tree" id="ex4-tree-inspector" style="min-height: 250px;"></div>
    </div>
</div>

## 5. Compressed Sparse Divisions

The `compressSparseDivisions` option merges divisions that would each contain only a single item into one combined division. This is useful when a dimension's grouping creates many near-empty buckets.

Here we use the dimensions API with a single `store` dimension plus `compressSparseDivisions`, which produces a structure similar to our original hand-built list — but generated automatically:

```js
{
    dimensionKey: 'store',
    type: 'categorical',
    behavior: { extents: 'terminal' },
    operations: { compressSparseDivisions: true }
}
```

Since each store has exactly 2 items (not 1), they won't be compressed in this case. But if we use `fruit` as the dimension instead — where "apple" has 2 items and "banana" has 2 items — the same applies. To see compression in action, imagine filtering down to a dataset where most divisions have only 1 item each. The API would merge them into a single flat list.

In this example we use a single `cost` numerical dimension with `compressSparseDivisions: true`. Since numerical dimensions with no subdivisions place all items in one division, compression has no visible effect here — but it demonstrates the option. The result is a flat sorted list of all 4 items by cost, navigable with <kbd>←</kbd> / <kbd>→</kbd>.

```js
{
    dimensionKey: 'cost',
    type: 'numerical',
    behavior: { extents: 'terminal' },
    operations: { compressSparseDivisions: true }
}
```

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h4>Chart</h4>
        <div id="ex5-chart-wrapper" style="position: relative;">
            <div id="ex5-chart"></div>
        </div>
    </div>
    <div>
        <h4>Inspector <button class="toggle-controls" @click="ex5Tree = !ex5Tree">{{ ex5Tree ? 'Show force' : 'Show tree' }}</button></h4>
        <div v-show="!ex5Tree" id="ex5-force-inspector" style="min-height: 250px;"></div>
        <div v-show="ex5Tree" id="ex5-tree-inspector" style="min-height: 250px;"></div>
    </div>
</div>

## 6. Level 0 Parent Node (Chart Description)

The `parentOptions.addLevel0` option adds a **root node** above all dimension nodes. This is useful for giving a high-level description of the entire chart — similar to where you would put alt text for a visualization. The user lands on this node first, hears the chart description, then drills down into dimensions.

```js
const structure = dataNavigator.structure({
    data,
    idKey: 'id',
    dimensions: {
        parentOptions: {
            addLevel0: {
                id: 'chart-root',
                edges: [],
                semantics: {
                    label: 'Stacked bar chart with 2 stores, each with 2 fruits. Press Enter to view dimensions or Escape to exit.'
                }
            }
        },
        values: [
            {
                dimensionKey: 'store',
                type: 'categorical',
                behavior: { extents: 'circular', childmostNavigation: 'across' }
            },
            {
                dimensionKey: 'fruit',
                type: 'categorical',
                behavior: { extents: 'circular', childmostNavigation: 'across' }
            }
        ]
    },
    genericEdges: [{ edgeId: 'any-exit', edge: {
        source: (_d, c) => c, target: () => '', navigationRules: ['exit']
    }}]
});
```

When a user enters the chart, they first land on the `chart-root` node which announces "Stacked bar chart with 2 stores, each with 2 fruits. Press Enter to view dimensions or Escape to exit." From there, <kbd>Enter</kbd> drills into the dimension nodes, and the rest of navigation works like before.

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h4>Chart</h4>
        <div id="ex6-chart-wrapper" style="position: relative;">
            <div id="ex6-chart"></div>
        </div>
    </div>
    <div>
        <h4>Inspector <button class="toggle-controls" @click="ex6Tree = !ex6Tree">{{ ex6Tree ? 'Show force' : 'Show tree' }}</button></h4>
        <div v-show="!ex6Tree" id="ex6-force-inspector" style="min-height: 250px;"></div>
        <div v-show="ex6Tree" id="ex6-tree-inspector" style="min-height: 250px;"></div>
    </div>
</div>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const showControls = ref(true);
const ex2Tree = ref(false);
const ex3Tree = ref(false);
const ex4Tree = ref(false);
const ex5Tree = ref(false);
const ex6Tree = ref(false);

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

        const { default: dataNavigator } = await import('data-navigator');
        const { Inspector, buildLabel } = await import('data-navigator-inspector');

        const chartWidth = 250;
        const chartHeight = 200;

        // Each example gets its own data with unique ids to avoid focus
        // collisions when multiple data-navigator instances share one page.
        const baseData = [
            { fruit: 'apple',  store: 'a', cost: 3,    selectAll: 'yes' },
            { fruit: 'banana', store: 'a', cost: 0.75, selectAll: 'yes' },
            { fruit: 'apple',  store: 'b', cost: 2.75, selectAll: 'yes' },
            { fruit: 'banana', store: 'b', cost: 1.25, selectAll: 'yes' }
        ];
        const makeData = (suffix) => baseData.map((d, i) => ({ ...d, id: `_${i}${suffix}` }));

        // Bokeh bar data for focus indicator drawing
        const barData = {
            data: [
                [[3, 2.75], [0, 0]],
                [[3.75, 4], [3, 2.75]]
            ],
            indices: {
                fruit: { apple: 0, banana: 1 },
                store: { a: 0, b: 1 }
            }
        };

        const drawBokehChart = (containerId, focusData) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            const stores = ['a', 'b'];
            const plt = Bokeh.Plotting;
            const p = plt.figure({
                x_range: stores, y_range: [0, 5.5],
                height: chartHeight, width: chartWidth,
                title: 'Fruit cost by store', output_backend: 'svg',
                toolbar_location: null, tools: ''
            });
            p.vbar({ x: stores, top: [3, 2.75], bottom: [0, 0], width: 0.8,
                     color: '#FCB5B6', line_color: '#8F0002' });
            p.vbar({ x: stores, top: [3.75, 4], bottom: [3, 2.75], width: 0.8,
                     color: '#F9E782', line_color: '#766500' });
            if (focusData) {
                p.vbar({
                    x: stores, top: focusData.top, bottom: focusData.bottom,
                    width: 0.8, line_width: 3,
                    color: ['transparent', 'transparent'],
                    line_color: focusData.line_color
                });
            }
            const r1 = p.square([-10000], [-10000], { color: '#FCB5B6', line_color: '#8F0002' });
            const r2 = p.square([-10000], [-10000], { color: '#F9E782', line_color: '#766500' });
            p.add_layout(new Bokeh.Legend({
                items: [
                    new Bokeh.LegendItem({ label: 'apple', renderers: [r1] }),
                    new Bokeh.LegendItem({ label: 'banana', renderers: [r2] })
                ],
                location: 'top_left', orientation: 'horizontal'
            }));
            plt.show(p, '#' + containerId);
            container.setAttribute('inert', 'true');
        };

        const drawFocusIndicator = (containerId, node) => {
            if (!node?.data) return;
            const fruitIndex = barData.indices.fruit[node.data.fruit];
            const storeIndex = barData.indices.store[node.data.store];
            if (fruitIndex === undefined || storeIndex === undefined) return;
            const bd = barData.data[fruitIndex];
            const line_color = storeIndex === 0 ? ['#000000', 'transparent'] : ['transparent', '#000000'];
            drawBokehChart(containerId, { top: bd[0], bottom: bd[1], line_color });
        };

        // Highlight helper for division/dimension nodes on Bokeh
        const drawGroupFocus = (containerId, node) => {
            if (!node.derivedNode && node.dimensionLevel === 0) {
                // Level 0 root node — highlight all bars
                drawBokehChart(containerId, {
                    top: [3.75, 4], bottom: [0, 0],
                    line_color: ['#000000', '#000000']
                });
            } else if (!node.derivedNode) {
                drawFocusIndicator(containerId, node);
            } else if (node.data?.dimensionKey) {
                // Dimension node — highlight all bars
                drawBokehChart(containerId, {
                    top: [3.75, 4], bottom: [0, 0],
                    line_color: ['#000000', '#000000']
                });
            } else {
                // Division node — highlight matching group
                const key = node.derivedNode;
                const value = node.data?.[key];
                if (key === 'store') {
                    const idx = barData.indices.store[value];
                    const line_color = idx === 0 ? ['#000000', 'transparent'] : ['transparent', '#000000'];
                    drawBokehChart(containerId, { top: [3.75, 4], bottom: [0, 0], line_color });
                } else if (key === 'fruit') {
                    const idx = barData.indices.fruit[value];
                    const bd = barData.data[idx];
                    drawBokehChart(containerId, { top: bd[0], bottom: bd[1], line_color: ['#000000', '#000000'] });
                } else {
                    drawBokehChart(containerId, {
                        top: [3.75, 4], bottom: [0, 0],
                        line_color: ['#000000', '#000000']
                    });
                }
            }
        };

        // Generic setup function for each example
        const setupExample = (opts) => {
            const { chartId, wrapperId, structure, entryPoint, inspectors, highlightFn } = opts;

            drawBokehChart(chartId, null);

            let current = null;
            let previous = null;
            let exitHandler = null;

            const enter = () => {
                const nextNode = input.enter();
                if (nextNode) initiateLifecycle(nextNode);
            };

            const rendering = dataNavigator.rendering({
                elementData: structure.nodes,
                defaults: { cssClass: 'dn-manual-focus-node' },
                suffixId: wrapperId,
                root: {
                    id: wrapperId,
                    description: 'Fruit cost by store chart.',
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
                inspectors.forEach(i => i.clear());
                drawBokehChart(chartId, null);
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
                if (!nextNode.renderId) nextNode.renderId = nextNode.id;
                if (!nextNode.spatialProperties) {
                    nextNode.spatialProperties = { x: 0, y: 0, width: chartWidth, height: chartHeight };
                }
                if (!nextNode.semantics?.label) {
                    nextNode.semantics = { ...nextNode.semantics, label: buildLabel(nextNode) };
                }
                if (previous) rendering.remove(previous);

                const element = rendering.render({ renderId: nextNode.renderId, datum: nextNode });
                element.addEventListener('keydown', e => {
                    const direction = input.keydownValidator(e);
                    if (direction) { e.preventDefault(); move(direction); }
                });
                element.addEventListener('focus', () => {
                    inspectors.forEach(i => i.highlight(nextNode.renderId));
                    highlightFn(chartId, nextNode);
                });
                element.addEventListener('blur', () => {
                    inspectors.forEach(i => i.clear());
                });

                input.focus(nextNode.renderId);
                previous = current;
                current = nextNode.id;
            };
        };

        const makeInspectors = (structure, forceId, treeId) => {
            const opts = {
                structure,
                size: 250,
                colorBy: 'dimensionLevel',
                edgeExclusions: ['any-exit'],
                nodeInclusions: ['exit']
            };
            const force = Inspector({ ...opts, container: forceId, mode: 'force' });
            const tree = Inspector({ ...opts, container: treeId, mode: 'tree' });
            return [force, tree];
        };

        const makeExitEdge = () => [{
            edgeId: 'any-exit',
            edge: { source: (_d, c) => c, target: () => '', navigationRules: ['exit'] }
        }];

        // ===== Example 1: Hand-built list =====
        const ex1Data = makeData('_a');
        const ex1Structure = {
            nodes: {
                '_0_a': { id: '_0_a', renderId: '_0_a', data: ex1Data[0], edges: ['_0_a-_1_a', 'any-exit'],
                      semantics: { label: 'fruit: apple. store: a. cost: 3. Data point.' },
                      spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight } },
                '_1_a': { id: '_1_a', renderId: '_1_a', data: ex1Data[1], edges: ['_0_a-_1_a', '_1_a-_2_a', 'any-exit'],
                      semantics: { label: 'fruit: banana. store: a. cost: 0.75. Data point.' },
                      spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight } },
                '_2_a': { id: '_2_a', renderId: '_2_a', data: ex1Data[2], edges: ['_1_a-_2_a', '_2_a-_3_a', 'any-exit'],
                      semantics: { label: 'fruit: apple. store: b. cost: 2.75. Data point.' },
                      spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight } },
                '_3_a': { id: '_3_a', renderId: '_3_a', data: ex1Data[3], edges: ['_2_a-_3_a', 'any-exit'],
                      semantics: { label: 'fruit: banana. store: b. cost: 1.25. Data point.' },
                      spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight } }
            },
            edges: {
                '_0_a-_1_a': { source: '_0_a', target: '_1_a', navigationRules: ['left', 'right'] },
                '_1_a-_2_a': { source: '_1_a', target: '_2_a', navigationRules: ['left', 'right'] },
                '_2_a-_3_a': { source: '_2_a', target: '_3_a', navigationRules: ['left', 'right'] },
                'any-exit': { source: (d, c) => c, target: () => '', navigationRules: ['exit'] }
            },
            navigationRules: {
                left: { key: 'ArrowLeft', direction: 'source' },
                right: { key: 'ArrowRight', direction: 'target' },
                exit: { key: 'Escape', direction: 'target' }
            }
        };

        const ex1Inspector = Inspector({
            structure: ex1Structure, container: 'ex1-inspector', size: 250,
            colorBy: 'dimensionLevel', edgeExclusions: ['any-exit'], nodeInclusions: ['exit']
        });

        setupExample({
            chartId: 'ex1-chart', wrapperId: 'ex1-chart-wrapper',
            structure: ex1Structure, entryPoint: '_0_a',
            inspectors: [ex1Inspector],
            highlightFn: drawFocusIndicator
        });

        // ===== Example 2: Two categorical dimensions (terminal) =====
        const ex2Structure = dataNavigator.structure({
            data: makeData('_b'), idKey: 'id',
            dimensions: {
                values: [
                    { dimensionKey: 'store', type: 'categorical',
                      behavior: { extents: 'terminal', childmostNavigation: 'across' } },
                    { dimensionKey: 'fruit', type: 'categorical',
                      behavior: { extents: 'terminal', childmostNavigation: 'across' } }
                ]
            },
            genericEdges: makeExitEdge()
        });
        const ex2Inspectors = makeInspectors(ex2Structure, 'ex2-force-inspector', 'ex2-tree-inspector');
        setupExample({
            chartId: 'ex2-chart', wrapperId: 'ex2-chart-wrapper',
            structure: ex2Structure,
            entryPoint: ex2Structure.dimensions[Object.keys(ex2Structure.dimensions)[0]].nodeId,
            inspectors: ex2Inspectors,
            highlightFn: drawGroupFocus
        });

        // ===== Example 3: Circular extents =====
        const ex3Structure = dataNavigator.structure({
            data: makeData('_c'), idKey: 'id',
            dimensions: {
                values: [
                    { dimensionKey: 'store', type: 'categorical',
                      behavior: { extents: 'circular', childmostNavigation: 'across' } },
                    { dimensionKey: 'fruit', type: 'categorical',
                      behavior: { extents: 'circular', childmostNavigation: 'across' } }
                ]
            },
            genericEdges: makeExitEdge()
        });
        const ex3Inspectors = makeInspectors(ex3Structure, 'ex3-force-inspector', 'ex3-tree-inspector');
        setupExample({
            chartId: 'ex3-chart', wrapperId: 'ex3-chart-wrapper',
            structure: ex3Structure,
            entryPoint: ex3Structure.dimensions[Object.keys(ex3Structure.dimensions)[0]].nodeId,
            inspectors: ex3Inspectors,
            highlightFn: drawGroupFocus
        });

        // ===== Example 4: Numerical dimension =====
        const ex4Structure = dataNavigator.structure({
            data: makeData('_d'), idKey: 'id',
            dimensions: {
                values: [
                    { dimensionKey: 'cost', type: 'numerical',
                      behavior: { extents: 'terminal' } }
                ]
            },
            genericEdges: makeExitEdge()
        });
        const ex4Inspectors = makeInspectors(ex4Structure, 'ex4-force-inspector', 'ex4-tree-inspector');
        setupExample({
            chartId: 'ex4-chart', wrapperId: 'ex4-chart-wrapper',
            structure: ex4Structure,
            entryPoint: ex4Structure.dimensions[Object.keys(ex4Structure.dimensions)[0]].nodeId,
            inspectors: ex4Inspectors,
            highlightFn: drawGroupFocus
        });

        // ===== Example 5: compressSparseDivisions =====
        const ex5Structure = dataNavigator.structure({
            data: makeData('_e'), idKey: 'id',
            dimensions: {
                values: [
                    { dimensionKey: 'cost', type: 'numerical',
                      behavior: { extents: 'terminal' },
                      operations: { compressSparseDivisions: true } }
                ]
            },
            genericEdges: makeExitEdge()
        });
        const ex5Inspectors = makeInspectors(ex5Structure, 'ex5-force-inspector', 'ex5-tree-inspector');
        setupExample({
            chartId: 'ex5-chart', wrapperId: 'ex5-chart-wrapper',
            structure: ex5Structure,
            entryPoint: ex5Structure.dimensions[Object.keys(ex5Structure.dimensions)[0]].nodeId,
            inspectors: ex5Inspectors,
            highlightFn: drawFocusIndicator
        });

        // ===== Example 6: Level 0 parent node =====
        const ex6Structure = dataNavigator.structure({
            data: makeData('_f'), idKey: 'id',
            dimensions: {
                parentOptions: {
                    addLevel0: {
                        id: 'chart-root',
                        edges: [],
                        semantics: {
                            label: 'Stacked bar chart with 2 stores, each with 2 fruits. Press Enter to view dimensions or Escape to exit.'
                        }
                    }
                },
                values: [
                    { dimensionKey: 'store', type: 'categorical',
                      behavior: { extents: 'circular', childmostNavigation: 'across' } },
                    { dimensionKey: 'fruit', type: 'categorical',
                      behavior: { extents: 'circular', childmostNavigation: 'across' } }
                ]
            },
            genericEdges: makeExitEdge()
        });
        const ex6Inspectors = makeInspectors(ex6Structure, 'ex6-force-inspector', 'ex6-tree-inspector');
        setupExample({
            chartId: 'ex6-chart', wrapperId: 'ex6-chart-wrapper',
            structure: ex6Structure,
            entryPoint: 'chart-root',
            inspectors: ex6Inspectors,
            highlightFn: drawGroupFocus
        });

    } catch (e) {
        console.error('Failed to initialize understanding-dimensions:', e);
    }
});

onUnmounted(() => { if (cleanup) cleanup(); });
</script>

## What's Next

Now that you understand the building blocks — categorical vs. numerical dimensions, terminal vs. circular extents, childmost navigation, compression, and Level 0 chart descriptions — see them applied to a real-world dataset in the [Dimensions API Example](/examples/dimensions-api).
