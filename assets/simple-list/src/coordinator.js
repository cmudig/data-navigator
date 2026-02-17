import { structure, callbacks, interactiveData, chartWidth, chartHeight } from './structure.js';
import { drawChart, drawFocusIndicator, createRenderer } from './rendering.js';
import { createInput } from './input.js';
import { Inspector } from 'data-navigator-inspector';

let current = null;
let previous = null;
let input;

// Create the inspector (passive — just visualizes the structure)
const inspector = Inspector({
    structure,
    container: 'inspector',
    size: 250,
    colorBy: 'dimensionLevel',
    edgeExclusions: ['any-exit'],
    nodeInclusions: ['exit']
});

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
    inspector.clear();
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
        inspector.highlight(nextNode.renderId);
    });

    element.addEventListener('blur', () => {
        inspector.clear();
    });

    input.focus(nextNode.renderId);
    previous = current;
    current = nextNode.id;
}
