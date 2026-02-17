import { structure, entryPoint, data, callbacks } from './structure.js';
import { createChart, updateChartHighlight, clearChartHighlight } from './chart.js';
import { createInput } from './input.js';
import { Inspector, buildLabel } from 'data-navigator-inspector';
import dataNavigator from 'data-navigator';

let current = null;
let previous = null;
let input;

// Create the Visa stacked bar chart
const stackedBar = createChart('stacked-chart-wrapper', data);

// Create the inspector (passive — just visualizes the structure)
const inspector = Inspector({
    structure,
    container: 'inspector',
    size: 325,
    colorBy: 'dimensionLevel',
    edgeExclusions: ['any-exit'],
    nodeInclusions: ['exit']
});

function enter() {
    const nextNode = input.enter();
    if (nextNode) initiateLifecycle(nextNode);
}

const rendering = dataNavigator.rendering({
    elementData: structure.nodes,
    defaults: { cssClass: 'dn-node' },
    suffixId: 'stacked-bar-example',
    root: {
        id: 'stacked-chart-wrapper',
        description: 'Stacked bar chart with category and date dimensions.',
        width: '100%',
        height: 0
    },
    entryButton: { include: true, callbacks: { click: enter } },
    exitElement: { include: true }
});
rendering.initialize();

callbacks.onExit = () => {
    rendering.exitElement.style.display = 'block';
    input.focus(rendering.exitElement.id);
    if (current) {
        rendering.remove(current);
        current = null;
    }
    inspector.clear();
    clearChartHighlight(stackedBar);
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
        updateChartHighlight(stackedBar, nextNode);
    });

    element.addEventListener('blur', () => {
        inspector.clear();
    });

    input.focus(nextNode.renderId);
    previous = current;
    current = nextNode.id;
}
