# Using the Console Menu

This example demonstrates the inspector's console menu feature alongside a stacked bar chart. Use the toggle button to switch between tree and force graph modes. The console menu provides an interactive text-based interface for inspecting nodes, edges, and navigation rules — similar to a browser developer console, but interactive.

## Keyboard Controls

<button class="toggle-controls" :aria-expanded="showControls" @click="showControls = !showControls">{{ showControls ? 'Hide controls' : 'Show controls' }}</button>

<div v-show="showControls">

| Command                        | Key                                         |
| ------------------------------ | ------------------------------------------- |
| Enter the structure            | Activate the "Enter navigation area" button |
| Exit                           | <kbd>Esc</kbd>                              |
| Left (backward along category) | <kbd>←</kbd>                                |
| Right (forward along category) | <kbd>→</kbd>                                |
| Up (backward along date)       | <kbd>↑</kbd>                                |
| Down (forward along date)      | <kbd>↓</kbd>                                |
| Drill down to child            | <kbd>Enter</kbd>                            |
| Drill up to category parent    | <kbd>W</kbd>                                |
| Drill up to date parent        | <kbd>J</kbd>                                |

At the deepest level, left/right moves across dates (via `childmostNavigation: 'across'`) and up/down moves across categories. Both dimensions wrap around circularly.

</div>

## Chart + Inspector + Console Menu

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h3>Stacked Bar Chart</h3>
        <div id="console-chart-wrapper" style="position: relative;"></div>
    </div>
    <div>
        <h3>Structure Inspector ({{ graphMode === 'tree' ? 'Tree' : 'Force' }}) + Console Menu</h3>
        <button class="toggle-controls" :aria-expanded="graphMode === 'tree'" @click="toggleGraphMode">{{ graphMode === 'tree' ? 'Switch to force graph' : 'Switch to tree graph' }}</button>
        <div id="console-inspector" style="min-height: 350px;"></div>
    </div>
</div>

<details class="dn-inspector-menu" id="console-event-log-details">
    <summary class="dn-menu-summary dn-menu-summary-top">Event Log</summary>
    <div style="display: flex; align-items: center; padding: 2px 4px;">
        <button class="dn-menu-log-btn" id="clear-event-log">clear</button>
    </div>
    <div id="console-event-entries" class="dn-menu-console-list" style="max-height: 200px;"></div>
</details>

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
    const { Inspector, buildLabel } = await import('../../src/inspector.js');

    // Inline utility — creates a valid DOM ID from a string
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

    // Create the Visa stacked bar chart
    const chartWrapper = document.getElementById('console-chart-wrapper');
    let stackedBar = document.createElement('stacked-bar-chart');
    const stackedProps = {
        mainTitle: '',
        subTitle: '',
        data,
        height: 200,
        width: 250,
        padding: { top: 10, bottom: 10, right: 10, left: 30 },
        colors: ['#FFFFFF', '#DDDDDD', '#BBBBBB', '#999999'],
        ordinalAccessor: 'category',
        valueAccessor: 'value',
        groupAccessor: 'date',
        uniqueID: 'inspector-console-menu-bar',
        legend: { labels: ['A', 'B', 'C', 'Other'] },
        dataLabel: { visible: false },
        yAxis: { visible: true, gridVisible: false },
        xAxis: { label: '', visible: false },
        showTotalValue: false,
        suppressEvents: true,
        layout: 'horizontal',
        clickHighlight: [],
        clickStyle: { color: '#222', strokeWidth: 1 },
        interactionKeys: [],
        accessibility: {
            elementsAreInterface: false,
            disableValidation: true,
            hideDataTableButton: true,
            keyboardNavConfig: { disabled: true },
            hideTextures: true,
            hideStrokes: false
        }
    };
    Object.keys(stackedProps).forEach(prop => {
        stackedBar[prop] = stackedProps[prop];
    });
    chartWrapper.appendChild(stackedBar);

    // Build the data-navigator structure
    let exitHandler = null;

    const structureOptions = {
        data,
        idKey: 'id',
        addIds: true,
        dimensions: {
            values: [
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
                },
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
                                    'Jan',
                                    'Feb',
                                    'Mar',
                                    'Apr',
                                    'May',
                                    'Jun',
                                    'Jul',
                                    'Aug',
                                    'Sep',
                                    'Oct',
                                    'Nov',
                                    'Dec'
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

    // 1. Create the inspector with the console menu enabled
    const inspectorContainer = document.getElementById('console-inspector');
    let inspector = null;

    function createInspector(mode) {
        if (inspector) inspector.destroy();
        return Inspector({
            structure,
            container: inspectorContainer,
            size: 325,
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

    // Listen for custom events emitted by the console menu
    const eventEntriesEl = document.getElementById('console-event-entries');
    const clearEventBtn = document.getElementById('clear-event-log');

    clearEventBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        eventEntriesEl.innerHTML = '';
    });

    function formatEventDetail(eventName, detail) {
        const action = eventName.replace('dn-inspector:', '');
        switch (action) {
            case 'item-hover':
                return `hover ${detail.type} "${detail.id}"` +
                    (detail.sourceData?.data ? ` — ${JSON.stringify(detail.sourceData.data).slice(0, 80)}` : '');
            case 'item-unhover':
                return `unhover ${detail.type} "${detail.id}"`;
            case 'item-check':
                return `check ${detail.type} "${detail.id}" (${detail.allChecked?.length || 0} total selected)`;
            case 'item-uncheck':
                return `uncheck ${detail.type} "${detail.id}" (${detail.allChecked?.length || 0} total selected)`;
            case 'item-log':
                return `log ${detail.type} "${detail.id}"` +
                    (detail.loggedData ? ` — ${JSON.stringify(detail.loggedData).slice(0, 100)}` : '');
            case 'selection-change': {
                const items = detail.checked || [];
                if (items.length === 0) return 'selection cleared';
                const summary = items.map(i => `${i.type}:${i.id}`).slice(0, 5).join(', ');
                return `selection changed → [${summary}]` +
                    (items.length > 5 ? ` +${items.length - 5} more` : '') +
                    ` (${items.length} total)`;
            }
            default:
                return `${action} ${JSON.stringify(detail).slice(0, 100)}`;
        }
    }

    ['dn-inspector:item-hover', 'dn-inspector:item-unhover',
     'dn-inspector:item-check', 'dn-inspector:item-uncheck',
     'dn-inspector:item-log', 'dn-inspector:selection-change'].forEach(eventName => {
        inspectorContainer.addEventListener(eventName, e => {
            const entry = document.createElement('div');
            entry.className = 'dn-menu-info';
            entry.style.fontSize = '10px';
            entry.style.padding = '1px 4px';
            entry.style.minHeight = '16px';
            entry.textContent = formatEventDetail(eventName, e.detail);
            eventEntriesEl.appendChild(entry);
            eventEntriesEl.scrollTop = eventEntriesEl.scrollHeight;
        });
    });

    // 2. Set up data-navigator rendering on the chart wrapper
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
            id: 'console-chart-wrapper',
            description: 'Stacked bar chart with category and date dimensions.',
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
            stackedBar.clickHighlight = [
                { category: node.data.category, date: node.data.date }
            ];
            stackedBar.interactionKeys = ['category', 'date'];
        } else if (node.data?.dimensionKey) {
            stackedBar.clickHighlight = [{ selectAll: 'yes' }];
            stackedBar.interactionKeys = ['selectAll'];
        } else {
            const key = node.derivedNode;
            const value = node.data?.[key];
            stackedBar.clickHighlight = [{ [key]: value }];
            stackedBar.interactionKeys = [key];
        }
    };

    const clearChartHighlight = () => {
        stackedBar.clickHighlight = [];
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
            nextNode.spatialProperties = { x: 0, y: 15, width: 250, height: 200 };
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

### About This Example

This example extends the stacked bar pattern with two key additions:

1. **Graph mode toggle** — Switch between `mode: 'tree'` (deterministic hierarchical layout) and `mode: 'force'` (force-directed graph) to compare how each visualizes the structure.

2. **Console menu** — The `showConsoleMenu` prop enables an interactive text-based panel below the tree inspector. It includes:
   - **Console** (collapsed) — Logged items appear here when you click "log" buttons
   - **Rendered Elements** — Nodes grouped by dimension/division, edges grouped by navigation rule, each with checkbox and log button
   - **Source Input** — Data, props, dimensions, and divisions

**Interacting with the menu:**
- **Checkbox** any node or edge to highlight it in the tree (other elements dim to 50% opacity, selected nodes get a dark stroke, selected edges get thickened)
- **Group checkboxes** on dimension, division, and nav rule headings select/deselect all items in that group
- **Hover** a menu item to see a focus indicator on the corresponding tree node or a thickened edge
- **Click "log"** to inspect detailed data in the Console section — node logs include connected edges, edge logs include source/target nodes
- **Virtual edges** (like "exit") that aren't normally rendered will be drawn dynamically when selected
- Console items are also interactive: checking or hovering them affects the tree, and vice versa
- All interactions emit `dn-inspector:*` CustomEvents on the container — expand the Event Log panel to see them
