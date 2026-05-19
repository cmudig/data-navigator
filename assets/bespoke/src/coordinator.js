import { structure, callbacks } from './structure.js';
import { createRenderer } from './rendering.js';
import { createInput } from './input.js';
import { Inspector } from '@data-navigator/inspector';

// Assumes the page has:
//   <div id="bespoke-wrapper" style="position: relative; display: inline-block;">
//     <img src="bespoke.jpg" aria-hidden="true" alt="" width="512" height="353">
//   </div>
//   <div id="inspector"></div>

let current = null;
let previous = null;
let input;

const inspector = Inspector({
    structure,
    container: 'inspector',
    size: 300,
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
};

function move(direction) {
    const nextNode = input.move(current, direction);
    if (nextNode) initiateLifecycle(nextNode);
}

function initiateLifecycle(nextNode) {
    if (previous) renderer.remove(previous);
    const element = renderer.render({ renderId: nextNode.renderId, datum: nextNode });
    element.addEventListener('keydown', e => {
        const direction = input.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            move(direction);
        }
    });
    element.addEventListener('focus', () => {
        inspector.highlight(nextNode.renderId);
    });
    element.addEventListener('blur', () => {
        inspector.clear();
    });
    input.focus(nextNode.renderId);
    previous = current;
    current = nextNode.id;
}
