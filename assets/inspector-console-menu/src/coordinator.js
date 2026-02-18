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
