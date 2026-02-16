import { structure, callbacks } from './structure.js';
import { drawChart, drawFocusIndicator, createRenderer } from './rendering.js';
import { createInput } from './input.js';

console.log('testing this loads');

// Assumes the page has two container elements:
//   <div id="chart-wrapper">
//      <div id="chart"></div> (Bokeh renders the visual chart here)
//      ... (Data Navigator builds its accessible layering here)
//   </div>

// Track the currently focused and previously focused node IDs
// so we can clean up old elements as the user navigates.
let current = null;
let previous = null;

// The input handler is created after the renderer (because it
// needs the exit element's ID), so we declare it with `let`.
let input;

// Called when the user clicks the "Enter navigation area" button.
function enter() {
    const nextNode = input.enter();
    if (nextNode) initiateLifecycle(nextNode);
}

// Create the accessible HTML layer (Data Navigator rendering module).
const renderer = createRenderer(structure, enter);

// Create the keyboard handler (Data Navigator input module).
input = createInput(structure, renderer.exitElement?.id);

// Wire the exit callback: pressing Escape cleans up the current
// node and moves focus to the exit element.
callbacks.onExit = () => {
    renderer.exitElement.style.display = 'block';
    input.focus(renderer.exitElement.id);
    if (current) {
        renderer.remove(current);
        current = null;
    }
    drawChart(null); // Redraw chart without focus indicator
};

// Draw the Bokeh chart (no focus indicator initially).
drawChart(null);

// Given a direction string ('left', 'right', or 'exit'),
// resolve the next node and kick off the render cycle.
function move(direction) {
    const nextNode = input.move(current, direction);
    if (nextNode) initiateLifecycle(nextNode);
}

// Core lifecycle: tear down the old element, create a new
// accessible element, attach keyboard + focus listeners,
// and move focus to it.
function initiateLifecycle(nextNode) {
    if (previous) renderer.remove(previous);

    // render() creates a <figure> with ARIA attributes that
    // assistive technology can announce.
    const element = renderer.render({
        renderId: nextNode.renderId,
        datum: nextNode
    });

    // Arrow keys and Escape navigate the graph.
    element.addEventListener('keydown', e => {
        const direction = input.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            move(direction);
        }
    });

    // When this element receives focus, redraw the Bokeh chart
    // with a bold outline on the matching bar segment.
    element.addEventListener('focus', () => {
        drawFocusIndicator(nextNode);
    });

    input.focus(nextNode.renderId);
    previous = current;
    current = nextNode.id;
}
