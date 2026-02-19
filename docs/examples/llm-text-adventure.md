# LLM Text Adventure

This example extends the [Data Text Adventure](/examples/data-text-adventure) with an optional **AI assistant**. In addition to navigation commands, you can type natural-language questions about the data — like "what's the highest value?" or "compare Group A to Group B" — and get responses powered by Claude.

Navigation commands (`enter`, `left`, `help`, `move to`, etc.) always work, with or without an API key. When a key is provided, any input that isn't a recognized command is sent to Claude as a question about the dataset.

::: warning AI Disclaimer
AI-generated answers may be inaccurate. You can ask the model to **"verify"** any answer — it will attempt to provide a Python script that checks the claim against the dataset. If a claim cannot be verified with code (e.g. it requires context beyond the data), the model will say so and recommend external verification.
:::

## Try It

Paste your [Anthropic API key](https://console.anthropic.com/settings/keys) below to enable AI questions. The key is stored in your browser's sessionStorage only — it is never sent to our servers.

<div id="api-key-section" style="margin-bottom: 1em;">
    <label for="api-key-input" style="display: block; font-weight: bold; margin-bottom: 4px;">Anthropic API Key</label>
    <input id="api-key-input" type="password" placeholder="sk-ant-..." style="width: 100%; max-width: 400px; padding: 6px 8px; font-size: 14px; border: 1px solid #ccc;" />
    <div id="api-key-status" style="font-size: 12px; color: #666; margin-top: 4px;">No key entered. Navigation works; AI questions are disabled.</div>
</div>

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h3>Stacked Bar Chart</h3>
        <div id="llm-chart-wrapper" style="position: relative; min-height: 220px;"></div>
    </div>
    <div style="flex: 1; min-width: 300px;">
        <h3>Text Navigation</h3>
        <div id="llm-text-chat-container"></div>
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
    const chartWrapper = document.getElementById('llm-chart-wrapper');
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
        uniqueID: 'llm-adventure-stacked-bar',
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

    // API key handling
    let apiKey = sessionStorage.getItem('dn-anthropic-key') || '';
    const keyInput = document.getElementById('api-key-input');
    const keyStatus = document.getElementById('api-key-status');
    keyInput.value = apiKey;

    const updateKeyStatus = () => {
        if (apiKey) {
            keyStatus.textContent = 'Key saved (sessionStorage). AI questions enabled.';
            keyStatus.style.color = '#2a7d2a';
        } else {
            keyStatus.textContent = 'No key entered. Navigation works; AI questions are disabled.';
            keyStatus.style.color = '#666';
        }
    };
    updateKeyStatus();

    keyInput.addEventListener('input', () => {
        apiKey = keyInput.value.trim();
        if (apiKey) {
            sessionStorage.setItem('dn-anthropic-key', apiKey);
        } else {
            sessionStorage.removeItem('dn-anthropic-key');
        }
        updateKeyStatus();
    });

    // LLM function — returns null when no key is set
    const llm = async (messages) => {
        if (!apiKey) return null;
        const systemContent = messages.find(m => m.role === 'system')?.content || '';
        const chatMessages = messages.filter(m => m.role !== 'system');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1024,
                system: systemContent,
                messages: chatMessages
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error ${response.status}`);
        }
        const body = await response.json();
        return body.content[0]?.text || '';
    };

    // Create text chat with LLM enabled
    dataNavigator.textChat({
        structure,
        container: 'llm-text-chat-container',
        data,
        llm,
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
@import 'data-navigator/text-chat.css';
</style>

### How It Works

The `textChat()` API accepts two additional options for LLM support:

```js
dataNavigator.textChat({
    structure,
    container: 'my-container',
    data,  // raw dataset — included in the LLM's context
    llm: async (messages) => {
        // messages is an array of { role, content } objects
        // Return a string response, or null to decline (e.g. no API key)
        const response = await callYourBackend(messages);
        return response;
    }
});
```

- **`data`** — the raw dataset array. When provided, the system prompt includes column names, row count, sample rows, and the full dataset so the model can compute over it.
- **`llm`** — an async function that receives the conversation history (system + user/assistant messages) and returns a string response. Return `null` to signal "not available right now" — the text chat will fall back to normal "unknown command" behavior.

Navigation commands are always checked first. Only unrecognized input is sent to the LLM. This means `left`, `help`, `move to jan`, etc. work exactly as before, regardless of whether an LLM is connected.

### Security

The `llm` option is a **function, not an API key**. The core library never touches credentials. In production, this function should call your own backend proxy that holds the key. This example uses Anthropic's `anthropic-dangerous-direct-browser-access` header for demonstration only — your API key goes directly from your browser to Anthropic's servers and is never sent to us.

### Verification

The model prioritizes answers that can be checked against the dataset. For statistical or quantitative claims, it briefly describes its method. You can then ask the model to **"verify"** any answer — it will write a short Python script (using the dataset as a JSON array) that computes the result, so you can run it yourself or inspect the logic. If a question goes beyond what the data can support (e.g. causal claims, external context), the model will say so and recommend verifying externally.

This doesn't guarantee correctness, but it makes the model's reasoning transparent and testable.

## The Complete Code

This code is designed to work **without a bundler**. Run `npm install data-navigator`, copy the files into a `src/` directory, and open `index.html` in your browser.

::: code-group

```js [coordinator.js]
import { structure, data } from './structure.js';
import { createChart, updateChartHighlight, clearChartHighlight } from './chart.js';
import { createLLM } from './llm.js';
import dataNavigator from 'data-navigator';

// Create the Visa stacked bar chart
const stackedBar = createChart('chart-wrapper', data);

// API key handling
let apiKey = sessionStorage.getItem('dn-anthropic-key') || '';
const keyInput = document.getElementById('api-key-input');
const keyStatus = document.getElementById('api-key-status');

const updateKeyStatus = () => {
    keyStatus.textContent = apiKey
        ? 'Key saved (sessionStorage). AI questions enabled.'
        : 'No key entered. Navigation works; AI questions are disabled.';
};
keyInput.value = apiKey;
updateKeyStatus();

keyInput.addEventListener('input', () => {
    apiKey = keyInput.value.trim();
    if (apiKey) {
        sessionStorage.setItem('dn-anthropic-key', apiKey);
    } else {
        sessionStorage.removeItem('dn-anthropic-key');
    }
    updateKeyStatus();
});

// Create the text chat interface with LLM
dataNavigator.textChat({
    structure,
    container: 'text-chat-container',
    data,
    llm: createLLM(() => apiKey),
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

```js [llm.js]
// Creates an LLM function for use with dataNavigator.textChat().
// getApiKey is called on each request so the key can change at runtime.
export function createLLM(getApiKey) {
    return async (messages) => {
        const apiKey = getApiKey();
        if (!apiKey) return null;

        const systemContent = messages.find(m => m.role === 'system')?.content || '';
        const chatMessages = messages.filter(m => m.role !== 'system');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1024,
                system: systemContent,
                messages: chatMessages
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error ${response.status}`);
        }

        const body = await response.json();
        return body.content[0]?.text || '';
    };
}
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

// Two categorical dimensions create a dual hierarchy.
// Category is first (left/right), date is second (up/down).
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
// Creates a Visa stacked bar chart web component inside the given container.
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
        uniqueID: 'llm-adventure-stacked-bar',
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

// Highlights bars on the chart based on the current node type.
export function updateChartHighlight(stackedBar, node) {
    if (!node.derivedNode) {
        // Leaf node — highlight specific bar segment
        stackedBar.clickHighlight = [
            { category: node.data.category, date: node.data.date }
        ];
        stackedBar.interactionKeys = ['category', 'date'];
    } else if (node.data?.dimensionKey) {
        // Dimension node — highlight all bars
        stackedBar.clickHighlight = [{ selectAll: 'yes' }];
        stackedBar.interactionKeys = ['selectAll'];
    } else {
        // Division node — highlight group
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
        <div style="margin-bottom: 1em;">
            <label for="api-key-input" style="display: block; font-weight: bold; margin-bottom: 4px;">Anthropic API Key</label>
            <input id="api-key-input" type="password" placeholder="sk-ant-..." style="width: 100%; max-width: 400px; padding: 6px 8px; font-size: 14px; border: 1px solid #ccc;" />
            <div id="api-key-status" style="font-size: 12px; color: #666; margin-top: 4px;"></div>
        </div>
        <div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
            <div>
                <h3>Stacked Bar Chart</h3>
                <div id="chart-wrapper" style="position: relative; min-height: 220px;"></div>
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

```css [style.css]
body {
    font-family: sans-serif;
    padding: 1em;
}
```

:::
