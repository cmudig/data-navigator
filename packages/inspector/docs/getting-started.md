# Getting Started

The inspector is a passive visualization tool that draws a [data-navigator](https://dig.cmu.edu/data-navigator/) `structure` object as a force-directed node-edge graph. It does not drive navigation — you set up data-navigator's rendering and input modules on your chart as normal, and call `inspector.highlight()` and `inspector.clear()` from your navigation lifecycle to keep the graph in sync.

## Install

The inspector uses modular D3 packages internally. Install alongside data-navigator:

```bash
npm install data-navigator data-navigator-inspector
```

## Basic Usage

```js
import dataNavigator from 'data-navigator';
import { Inspector } from 'data-navigator-inspector';

// 1. Build a structure
const structure = dataNavigator.structure({
    data: [
        { id: 'a', cat: 'x', val: 3 },
        { id: 'b', cat: 'x', val: 1 },
        { id: 'c', cat: 'y', val: 2 }
    ],
    idKey: 'id',
    dimensions: {
        values: [
            { dimensionKey: 'cat', type: 'categorical' },
            { dimensionKey: 'val', type: 'numerical' }
        ]
    }
});

// 2. Create the inspector (passive — just draws the graph)
const inspector = Inspector({
    structure,
    container: 'inspector-div',
    size: 300
});

// 3. Set up data-navigator rendering on your chart
const entryPoint = structure.dimensions[Object.keys(structure.dimensions)[0]].nodeId;

const rendering = dataNavigator.rendering({
    elementData: structure.nodes,
    suffixId: 'my-chart',
    root: { id: 'chart-div', width: '100%', height: 0 },
    entryButton: {
        include: true,
        callbacks: {
            click: () => {
                const nextNode = input.enter();
                if (nextNode) initiateLifecycle(nextNode);
            }
        }
    },
    exitElement: { include: true }
});
rendering.initialize();

// 4. Set up input handler
const input = dataNavigator.input({
    structure,
    navigationRules: structure.navigationRules,
    entryPoint,
    exitPoint: rendering.exitElement?.id
});

// 5. Navigation lifecycle — update inspector on focus/blur
let current = null;
let previous = null;

const move = direction => {
    const nextNode = input.move(current, direction);
    if (nextNode) initiateLifecycle(nextNode);
};

const initiateLifecycle = nextNode => {
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

    // Connect inspector to navigation events
    element.addEventListener('focus', () => {
        inspector.highlight(nextNode.renderId);
    });
    element.addEventListener('blur', () => {
        inspector.clear();
    });

    input.focus(nextNode.renderId);
    previous = current;
    current = nextNode.id;
};
```

The "Enter navigation area" button appears in your chart area (from data-navigator's rendering module), not inside the inspector. The inspector just draws the force graph and updates its focus indicator when you call `highlight()`.

## What the Graph Shows

The inspector draws every **node** and **edge** in the structure object as a force-directed graph. Nodes are colored by their level in the hierarchy:

- **Dimension nodes** (level 1) represent the top-level grouping dimensions (e.g. "category", "date").
- **Division nodes** (level 2) represent the groups within a dimension (e.g. "Group A", "Group B").
- **Data nodes** (level 3, leaf) represent individual data points.

Edges show the navigable connections between nodes: parent-child relationships within a dimension, sibling links between nodes at the same level, and cross-dimension links created by `childmostNavigation: 'across'`.

When you call `highlight(nodeId)`, a **focus indicator** (black circle outline) moves to that node in the graph and a **tooltip** displays information about it. Calling `clear()` hides both.

## API Options

```js
Inspector({
    structure, // Required. A data-navigator structure object.
    container, // Required. DOM element or string ID to mount in.
    size: 300, // Width and height of the SVG graph (default: 300).
    colorBy: 'dimensionLevel', // Field to color nodes by (default: 'dimensionLevel').
    nodeRadius: 5, // Radius of node circles (default: 5).
    edgeExclusions: [], // Edge IDs to hide from the graph.
    nodeInclusions: [] // Extra pseudo-node IDs to include (e.g. 'exit').
});
```

### Return value

`Inspector()` returns an object with:

| Property            | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `svg`               | The SVG element containing the force graph.              |
| `highlight(nodeId)` | Move the focus indicator to a node and show its tooltip. |
| `clear()`           | Hide the focus indicator and tooltip.                    |
| `destroy()`         | Remove the inspector from the DOM.                       |

## Handling Exit

To support the <kbd>Esc</kbd> key for exiting navigation, add an exit edge to your structure and wire up the exit handler in your own lifecycle:

```js
let exitHandler = null;

const structure = dataNavigator.structure({
    // ...data and dimensions...
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

// After setting up rendering and input:
exitHandler = () => {
    rendering.exitElement.style.display = 'block';
    input.focus(rendering.exitElement.id);
    if (current) {
        rendering.remove(current);
        current = null;
    }
    inspector.clear();
};
```

Exclude the exit edge from the inspector graph (it's a logical edge, not a visual one) and include its pseudo-node:

```js
Inspector({
    // ...
    edgeExclusions: ['any-exit'],
    nodeInclusions: ['exit']
});
```

## Using with a Visualization

The inspector is designed to run alongside an existing visualization. You set up data-navigator's rendering and input on your chart, and connect the inspector via `highlight()` / `clear()` calls in your navigation lifecycle's focus and blur handlers. See the [Stacked Bar Example](/examples/stacked-bar) for a working demonstration of this pattern.
