# Data Navigator Inspector

This is part of the [Data Navigator](https://dig.cmu.edu/data-navigator/) project. The inspector is a passive visualization tool that draws a data-navigator `structure` object as a force-directed node-edge graph. As you navigate through a chart using data-navigator's standard keyboard controls, the inspector's focus indicator follows your position in the graph.

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

## Simple Example

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
    const { Inspector, buildLabel } = await import('../src/inspector.js');

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
        uniqueID: 'inspector-bar-chart',
        dataLabel: { visible: false },
        clickHighlight: [],
        hoverHighlight: {},
        clickStyle: {color: '#222', strokeWidth: 2},
        hoverStyle: {strokeWidth: 1},
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
        suffixId: 'simple-example',
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
            barChart.hoverHighlight = {};
        } else if (node.data?.dimensionKey) {
            // Dimension node — highlight all bars
            barChart.hoverHighlight = { selectAll: 'yes' };
            barChart.interactionKeys = ['selectAll'];
            barChart.hoverStyle = { strokeWidth: 1 };
            barChart.clickHighlight = [];
        } else {
            // Division node — highlight group
            const key = node.derivedNode;
            const value = node.data?.[key];
            barChart.hoverHighlight = { [key]: value };
            barChart.interactionKeys = [key];
            barChart.hoverStyle = { strokeWidth: 2 };
            barChart.clickHighlight = [];
        }
    };

    const clearChartHighlight = () => {
        barChart.clickHighlight = [];
        barChart.hoverHighlight = {};
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
            nextNode.renderId = nextNode.id
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
