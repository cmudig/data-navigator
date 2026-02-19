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
