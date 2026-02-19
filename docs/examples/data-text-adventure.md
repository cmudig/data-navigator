# Data Text Adventure

This example demonstrates the **text chat** interface — a text adventure-style alternative to keyboard navigation. Instead of pressing arrow keys to navigate, you type commands like `left`, `right`, `child`, or `parent` into a text input and see descriptions of where you moved.

This is especially useful for **mobile users**, where screen readers use a virtual cursor that doesn't fire the DOM `focus` events required by data-navigator's keyboard navigation. The text chat keeps focus on a single text input at all times, uses `aria-live` to announce navigation results to screen readers, and calls back to the developer so they can update chart visuals without moving DOM focus.

## Try It

Type commands in the text input below. Try `help` to see what's available, then `enter` to begin, `left`/`right` to navigate, and `exit` to leave. You can also use up/down arrow keys in the input to recall previous commands.

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h3>Stacked Bar Chart</h3>
        <div id="text-chat-chart-wrapper" style="position: relative; min-height: 220px;"></div>
    </div>
    <div style="flex: 1; min-width: 300px;">
        <h3>Text Navigation</h3>
        <div id="text-chat-container"></div>
    </div>
</div>

<script setup>
import { onMounted } from 'vue';

onMounted(async () => {
    const { default: dataNavigator } = await import('data-navigator');

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
    const chartWrapper = document.getElementById('text-chat-chart-wrapper');
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
        uniqueID: 'text-chat-stacked-bar',
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

    // Build structure
    const structure = dataNavigator.structure({
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
                }
            ]
        }
    });

    // Chart highlight helpers
    const updateChartHighlight = (node) => {
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

    // Create text chat with natural-language command labels
    dataNavigator.textChat({
        structure,
        container: 'text-chat-container',
        commandLabels: {
            left: 'left across categories',
            right: 'right across categories',
            up: 'up across dates',
            down: 'down across dates',
            child: 'drill in',
            parent: 'back out',
            exit: 'exit navigation'
        },
        onNavigate: (node) => {
            updateChartHighlight(node);
        },
        onExit: () => {
            clearChartHighlight();
        }
    });
});
</script>

<style>
/* Import text chat styles for this page */
@import 'data-navigator/text-chat.css';
</style>

### About This Example

The text chat interface is created with `dataNavigator.textChat()`. It handles all navigation internally — you provide a `structure`, a `container` element, and optional callbacks. The `onNavigate` callback receives the node that was navigated to, and the `onExit` callback fires when the user types `exit`.

Commands support fuzzy prefix matching: typing `l` matches `left`, typing `r` matches `right`. If a prefix is ambiguous (e.g. `c` could be `child` or `clear`), the chat shows the options. You can use up/down arrow keys to recall previous commands.

The `aria-live` toggle checkbox controls whether navigation results are automatically announced by screen readers. When unchecked, users can still read the chat log manually.

### Natural-Language Command Labels

Data Navigator's navigation rules use short internal names like `left`, `child`, and `parent`. These work well as keyboard shortcuts, but in a text interface they can feel cryptic — especially compound rules like `parent_category` that the dimensions API generates automatically.

The `commandLabels` option maps rule names to human-readable descriptions. When labels are provided, `help` output shows the label alongside the command (e.g. `drill in (child)`) and navigation responses use the label instead of the raw rule name (e.g. `drill in: date: Jan...` instead of `child: date: Jan...`).

```js
commandLabels: {
    left: 'left across categories',
    right: 'right across categories',
    up: 'up across dates',
    down: 'down across dates',
    child: 'drill in',
    parent: 'back out',
    exit: 'exit navigation'
}
```

This lets you tailor the interface to your chart's semantics — a map might use `pan north` / `pan south`, a tree might use `expand` / `collapse`, and a timeline might use `earlier` / `later`. The typed commands still use the short rule names (with fuzzy matching), so `l` still matches `left` regardless of the label.

## The Complete Code

This code is designed to work **without a bundler**. Run `npm install data-navigator`, copy the files into a `src/` directory, and open `index.html` in your browser.

::: code-group

```js [coordinator.js]
import dataNavigator from 'data-navigator';
import { structure, data } from './structure.js';
import { createChart, updateChartHighlight, clearChartHighlight } from './chart.js';

// Assumes the page has:
//   <div id="chart-wrapper" style="position: relative;"></div>
//   <div id="text-chat-container"></div>

const stackedBar = createChart('chart-wrapper', data);

const chat = dataNavigator.textChat({
    structure,
    container: 'text-chat-container',
    commandLabels: {
        left: 'left across categories',
        right: 'right across categories',
        up: 'up across dates',
        down: 'down across dates',
        child: 'drill in',
        parent: 'back out',
        exit: 'exit navigation'
    },
    onNavigate: (node) => {
        updateChartHighlight(stackedBar, node);
    },
    onExit: () => {
        clearChartHighlight(stackedBar);
    }
});
```

```js [structure.js]
import dataNavigator from 'data-navigator';

const createValidId = s => '_' + s.replace(/[^a-zA-Z0-9_-]+/g, '_');

export const data = [
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

export const structure = dataNavigator.structure({
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
            }
        ]
    }
});
```

```js [chart.js]
export function createChart(containerId, data) {
    const wrapper = document.getElementById(containerId);
    const stackedBar = document.createElement('stacked-bar-chart');
    const props = {
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
        uniqueID: 'text-chat-stacked-bar',
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
    Object.keys(props).forEach(prop => {
        stackedBar[prop] = props[prop];
    });
    wrapper.appendChild(stackedBar);
    return stackedBar;
}

export function updateChartHighlight(stackedBar, node) {
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
}

export function clearChartHighlight(stackedBar) {
    stackedBar.clickHighlight = [];
}
```

```html [index.html]
<html>
    <head>
        <link rel="stylesheet" href="./node_modules/data-navigator/text-chat.css" />
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
        <div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
            <div>
                <h3>Stacked Bar Chart</h3>
                <div id="chart-wrapper" style="position: relative;"></div>
            </div>
            <div style="flex: 1; min-width: 300px;">
                <h3>Text Navigation</h3>
                <div id="text-chat-container"></div>
            </div>
        </div>
    </body>
    <script src="https://unpkg.com/@visa/stacked-bar-chart@7/dist/stacked-bar-chart/stacked-bar-chart.esm.js" type="module"></script>
    <script type="module" src="./src/coordinator.js"></script>
</html>
```

:::

### Inspiration: Text Adventures

This interaction approach was inspired by [text adventure games](https://textadventures.co.uk) — a genre where players explore worlds, solve puzzles, and interact with characters entirely through typed commands. Text adventures have a long history of being accessible to screen reader users, since the entire experience is already text-based. If you've never played one, [textadventures.co.uk](https://textadventures.co.uk) hosts a large collection of free games worth exploring.
