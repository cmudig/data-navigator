# Using the Dimensions API

The dimensions API is one of the most powerful features of Data Navigator. Instead of manually defining every node and edge, you describe your data's **dimensions** — the meaningful axes along which a user might want to navigate — and Data Navigator automatically builds a hierarchical navigation structure.

This example uses the same dataset as the [Stacked Bar Chart](/examples/stacked-bar) example but rendered as a line chart, to show that the same structure works across different visual representations.

## Keyboard Controls

<button class="toggle-controls" :aria-expanded="showControls" @click="showControls = !showControls">{{ showControls ? 'Hide controls' : 'Show controls' }}</button>

<div v-show="showControls">

| Command                           | Key                                         |
| --------------------------------- | ------------------------------------------- |
| Enter the structure               | Activate the "Enter navigation area" button |
| Exit                              | <kbd>Esc</kbd>                              |
| Left (backward along date)        | <kbd>←</kbd>                                |
| Right (forward along date)        | <kbd>→</kbd>                                |
| Up (backward along category)      | <kbd>↑</kbd>                                |
| Down (forward along category)     | <kbd>↓</kbd>                                |
| Drill down to child               | <kbd>Enter</kbd>                            |
| Drill up to date parent           | <kbd>W</kbd>                                |
| Drill up to category parent       | <kbd>J</kbd>                                |

At the deepest level, left/right moves across categories and up/down moves across dates. Both dimensions wrap around circularly.

</div>

## Chart + [Inspector](/examples/using-the-inspector)

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h3>Line Chart</h3>
        <div id="line-chart-wrapper" style="position: relative;"></div>
    </div>
    <div>
        <h3>Structure Inspector</h3>
        <div id="dimensions-inspector" style="min-height: 350px; transform-origin: top left;"></div>
    </div>
</div>

### How the Dimensions API Works

When you pass a `dimensions` configuration to `dataNavigator.structure()`, Data Navigator builds a multi-level hierarchy from your flat data automatically. Each dimension becomes a level in the navigation tree.

**Date dimension (left/right).** The first dimension listed, `date`, is `categorical`. Data Navigator groups the data by date and creates a **dimension node** at the top with **division nodes** underneath — one for each unique date value (Jan through Dec). Pressing <kbd>Enter</kbd> from the `date` dimension drills down into these divisions. Use <kbd>←</kbd> and <kbd>→</kbd> to move between divisions. Since this dimension uses `circular` extents, movement wraps around from December back to January. The custom `sortFunction` ensures dates appear in calendar order rather than alphabetical order.

**Category dimension (up/down).** The second dimension, `category`, is also `categorical`. Within each date division, data points are further grouped by category. Pressing <kbd>Enter</kbd> from a date division drills into the category sub-groups within that date. Use <kbd>↑</kbd> and <kbd>↓</kbd> to move between category divisions (Group A, Group B, Group C, Other).

**At the child-most level,** all four arrow keys are available regardless of which dimension you drilled down from. This is because both dimensions use `childmostNavigation: 'across'`, which tells Data Navigator to make the sibling navigation for each dimension available at the leaf level. So <kbd>←</kbd> and <kbd>→</kbd> move across categories while <kbd>↑</kbd> and <kbd>↓</kbd> move across dates — even though you may have arrived by drilling down through dates first. This means you can freely explore data points in any direction once you reach the bottom of the hierarchy.

**Drilling back up.** Each dimension gets its own "drill up" key. Press <kbd>W</kbd> to drill up to the date parent, or <kbd>J</kbd> to drill up to the category parent. These keys are automatically assigned from Data Navigator's default key pool.

This dual-hierarchy structure — where two dimensions create an interconnected tree that users can traverse in any direction at the leaves — is what makes the dimensions API powerful. You describe the structure declaratively and Data Navigator handles all the edge generation.

<script setup>
import { ref, onMounted } from 'vue';

const showControls = ref(true);

onMounted(async () => {
    const { default: dataNavigator } = await import('data-navigator');
    const { Inspector, buildLabel } = await import('data-navigator-inspector');

    const createValidId = s => '_' + s.replace(/[^a-zA-Z0-9_-]+/g, '_');

    const data = [
        { date: 'Jan', category: 'Group A', value: 120, count: 420, selectAll: 'yes' },
        { date: 'Feb', category: 'Group A', value: 121, count: 439, selectAll: 'yes' },
        { date: 'Mar', category: 'Group A', value: 119, count: 402, selectAll: 'yes' },
        { date: 'Apr', category: 'Group A', value: 114, count: 434, selectAll: 'yes' },
        { date: 'May', category: 'Group A', value: 102, count: 395, selectAll: 'yes' },
        { date: 'Jun', category: 'Group A', value: 112, count: 393, selectAll: 'yes' },
        { date: 'Jul', category: 'Group A', value: 130, count: 445, selectAll: 'yes' },
        { date: 'Aug', category: 'Group A', value: 124, count: 456, selectAll: 'yes' },
        { date: 'Sep', category: 'Group A', value: 119, count: 355, selectAll: 'yes' },
        { date: 'Oct', category: 'Group A', value: 106, count: 464, selectAll: 'yes' },
        { date: 'Nov', category: 'Group A', value: 123, count: 486, selectAll: 'yes' },
        { date: 'Dec', category: 'Group A', value: 133, count: 491, selectAll: 'yes' },
        { date: 'Jan', category: 'Group B', value: 89, count: 342, selectAll: 'yes' },
        { date: 'Feb', category: 'Group B', value: 93, count: 434, selectAll: 'yes' },
        { date: 'Mar', category: 'Group B', value: 82, count: 378, selectAll: 'yes' },
        { date: 'Apr', category: 'Group B', value: 92, count: 323, selectAll: 'yes' },
        { date: 'May', category: 'Group B', value: 90, count: 434, selectAll: 'yes' },
        { date: 'Jun', category: 'Group B', value: 85, count: 376, selectAll: 'yes' },
        { date: 'Jul', category: 'Group B', value: 88, count: 404, selectAll: 'yes' },
        { date: 'Aug', category: 'Group B', value: 84, count: 355, selectAll: 'yes' },
        { date: 'Sep', category: 'Group B', value: 90, count: 432, selectAll: 'yes' },
        { date: 'Oct', category: 'Group B', value: 80, count: 455, selectAll: 'yes' },
        { date: 'Nov', category: 'Group B', value: 92, count: 445, selectAll: 'yes' },
        { date: 'Dec', category: 'Group B', value: 97, count: 321, selectAll: 'yes' },
        { date: 'Jan', category: 'Group C', value: 73, count: 456, selectAll: 'yes' },
        { date: 'Feb', category: 'Group C', value: 74, count: 372, selectAll: 'yes' },
        { date: 'Mar', category: 'Group C', value: 68, count: 323, selectAll: 'yes' },
        { date: 'Apr', category: 'Group C', value: 66, count: 383, selectAll: 'yes' },
        { date: 'May', category: 'Group C', value: 72, count: 382, selectAll: 'yes' },
        { date: 'Jun', category: 'Group C', value: 70, count: 365, selectAll: 'yes' },
        { date: 'Jul', category: 'Group C', value: 74, count: 296, selectAll: 'yes' },
        { date: 'Aug', category: 'Group C', value: 68, count: 312, selectAll: 'yes' },
        { date: 'Sep', category: 'Group C', value: 75, count: 334, selectAll: 'yes' },
        { date: 'Oct', category: 'Group C', value: 66, count: 386, selectAll: 'yes' },
        { date: 'Nov', category: 'Group C', value: 85, count: 487, selectAll: 'yes' },
        { date: 'Dec', category: 'Group C', value: 89, count: 512, selectAll: 'yes' },
        { date: 'Jan', category: 'Other', value: 83, count: 432, selectAll: 'yes' },
        { date: 'Feb', category: 'Other', value: 87, count: 364, selectAll: 'yes' },
        { date: 'Mar', category: 'Other', value: 76, count: 334, selectAll: 'yes' },
        { date: 'Apr', category: 'Other', value: 86, count: 395, selectAll: 'yes' },
        { date: 'May', category: 'Other', value: 87, count: 354, selectAll: 'yes' },
        { date: 'Jun', category: 'Other', value: 77, count: 386, selectAll: 'yes' },
        { date: 'Jul', category: 'Other', value: 79, count: 353, selectAll: 'yes' },
        { date: 'Aug', category: 'Other', value: 85, count: 288, selectAll: 'yes' },
        { date: 'Sep', category: 'Other', value: 87, count: 353, selectAll: 'yes' },
        { date: 'Oct', category: 'Other', value: 76, count: 322, selectAll: 'yes' },
        { date: 'Nov', category: 'Other', value: 96, count: 412, selectAll: 'yes' },
        { date: 'Dec', category: 'Other', value: 104, count: 495, selectAll: 'yes' }
    ];

    // Create the Visa line chart
    const chartWrapper = document.getElementById('line-chart-wrapper');
    let lineChart = document.createElement('line-chart');
    const lineProps = {
        mainTitle: '',
        subTitle: '',
        data,
        height: 200,
        width: 450,
        padding: { top: 10, bottom: 30, right: 0, left: 20 },
        colors: ['#999999', '#BBBBBB', '#DDDDDD', '#FFFFFF'],
        ordinalAccessor: 'date',
        seriesLabel: {visible:false},
        valueAccessor: 'value',
        seriesAccessor: 'category',
        uniqueID: 'examples-line-chart',
        dataLabel: { visible: false },
        legend: { visible: false },
        yAxis: { visible: true, gridVisible: false },
        xAxis: { visible: true, label: '' },
        suppressEvents: true,
        clickHighlight: [],
        clickStyle: { color: '#222', strokeWidth: 2 },
        interactionKeys: [],
        strokeWidth: 1,
        accessibility: {
            elementsAreInterface: false,
            disableValidation: true,
            hideDataTableButton: true,
            keyboardNavConfig: { disabled: true },
            hideTextures: true,
            hideStrokes: false
        }
    };
    Object.keys(lineProps).forEach(prop => {
        lineChart[prop] = lineProps[prop];
    });
    chartWrapper.appendChild(lineChart);

    // Build the data-navigator structure using the dimensions API
    let exitHandler = null;

    const structure = dataNavigator.structure({
        data,
        idKey: 'id',
        addIds: true,
        dimensions: {
            values: [
                {
                    dimensionKey: 'date',
                    type: 'categorical',
                    behavior: {
                        extents: 'circular',
                        childmostNavigation: 'across'
                    },
                    operations: {
                        sortFunction: (a, b) => {
                            if (a.values) {
                                const months = [
                                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                                ];
                                let aMonth =
                                    a.values[Object.keys(a.values)[0]].date ||
                                    a.values[Object.keys(a.values)[0]].data?.date;
                                let bMonth =
                                    b.values[Object.keys(b.values)[0]].date ||
                                    b.values[Object.keys(b.values)[0]].data?.date;
                                return months.indexOf(aMonth) - months.indexOf(bMonth);
                            }
                        }
                    }
                },
                {
                    dimensionKey: 'category',
                    type: 'categorical',
                    divisionOptions: {
                        divisionNodeIds: (dimensionKey, keyValue, i) => {
                            return createValidId(dimensionKey + keyValue + i);
                        }
                    },
                    behavior: {
                        extents: 'circular',
                        childmostNavigation: 'across'
                    }
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

    // Create the inspector (passive)
    const inspector = Inspector({
        structure,
        container: 'dimensions-inspector',
        size: 325,
        colorBy: 'dimensionLevel',
        edgeExclusions: ['any-exit'],
        nodeInclusions: ['exit']
    });

    // Set up data-navigator rendering on the chart wrapper
    let current = null;
    let previous = null;

    const enter = () => {
        const nextNode = input.enter();
        if (nextNode) initiateLifecycle(nextNode);
    };

    const rendering = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-node' },
        suffixId: 'dimensions-example',
        root: {
            id: 'line-chart-wrapper',
            description: 'Line chart with category and date dimensions.',
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
            // Leaf node — highlight specific data point
            lineChart.clickHighlight = [
                { category: node.data.category, date: node.data.date }
            ];
            lineChart.interactionKeys = ['category', 'date'];
        } else if (node.data?.dimensionKey) {
            // Dimension node — highlight all lines
            lineChart.clickHighlight = [{ selectAll: 'yes' }];
            lineChart.interactionKeys = ['selectAll'];
        } else {
            // Division node — highlight group
            const key = node.derivedNode;
            const value = node.data?.[key];
            lineChart.clickHighlight = [{ [key]: value }];
            lineChart.interactionKeys = [key];
        }
    };

    const clearChartHighlight = () => {
        lineChart.clickHighlight = [];
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

    // Set up input handler
    const input = dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint,
        exitPoint: rendering.exitElement?.id
    });

    // Navigation lifecycle
    const move = direction => {
        const nextNode = input.move(current, direction);
        if (nextNode) initiateLifecycle(nextNode);
    };

    const initiateLifecycle = nextNode => {
        if (!nextNode.renderId) {
            nextNode.renderId = nextNode.id;
        }
        if (!nextNode.spatialProperties) {
            nextNode.spatialProperties = { x: 0, y: 15, width: 450, height: 200 };
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
