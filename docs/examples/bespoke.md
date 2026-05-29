# Bespoke Visualization Navigation

This example shows how to add keyboard navigation to a bespoke SVG visualization — a stratigraphic chart of glacial till units in Wisconsin. The chart has no charting library; it is a hand-authored SVG. The navigation structure is defined manually (no dimensions API), with three top-level regions navigable left and right, and formations within each region navigable up and down. Left and right within a region cross to the nearest formation in the adjacent column, paired by vertical proximity.

## Keyboard Controls

<button class="toggle-controls" :aria-expanded="showControls" @click="showControls = !showControls">{{ showControls ? 'Hide controls' : 'Show controls' }}</button>

<div v-show="showControls">

| Command                                               | Key                                              |
| ----------------------------------------------------- | ------------------------------------------------ |
| Enter the structure                                   | Activate the "Enter navigation area" button      |
| Exit                                                  | <kbd>Esc</kbd>                                   |
| Previous / next region (at region level)              | <kbd>←</kbd> / <kbd>→</kbd>                      |
| Up / down within a column (at formation level)        | <kbd>↑</kbd> / <kbd>↓</kbd>                      |
| Cross to nearest formation in the left / right column | <kbd>←</kbd> / <kbd>→</kbd> (at formation level) |
| Drill into region                                     | <kbd>Enter</kbd>                                 |
| Drill out to region                                   | <kbd>Backspace</kbd>                             |

The three columns wrap circularly at both levels. At the formation level, left and right target the formation in the adjacent column whose vertical center is closest to the current formation's vertical center.

</div>

## Chart + Inspector

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h3>Stratigraphic Chart</h3>
        <div id="bespoke-wrapper" style="position: relative; display: inline-block;">
            <img src="/bespoke.jpg" aria-hidden="true" alt="" width="512" height="353" style="display: block;">
        </div>
    </div>
    <div>
        <h3>Structure Inspector</h3>
        <div id="bespoke-inspector" style="min-height: 350px;"></div>
    </div>
</div>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const showControls = ref(true);
let cleanup = null;

onMounted(async () => {
    const { default: dataNavigator } = await import('data-navigator');
    const { Inspector } = await import('@data-navigator/inspector');

    let exitHandler = null;

    const structure = {
        nodes: {
            'glacial-sediment-w-nw': {
                id: 'glacial-sediment-w-nw', renderId: 'glacial-sediment-w-nw',
                edges: ['gswnw-gsnne', 'gsnee-gswnw', 'gswnw-trade-river', 'any-exit'],
                data: {},
                semantics: { label: 'Glacial sediment from the W and NW. Region. Contains Trade River, Pierce, and Marathon.' },
                spatialProperties: { x: 1, y: 1, width: 142, height: 351 }
            },
            'glacial-sediment-n-ne': {
                id: 'glacial-sediment-n-ne', renderId: 'glacial-sediment-n-ne',
                edges: ['gswnw-gsnne', 'gsnne-gsnee', 'gsnne-miller-creek', 'any-exit'],
                data: {},
                semantics: { label: 'Glacial sediment from the N and NE. Region. Contains Miller Creek, Copper Falls, and River Falls.' },
                spatialProperties: { x: 144, y: 1, width: 146, height: 351 }
            },
            'glacial-sediment-ne-e': {
                id: 'glacial-sediment-ne-e', renderId: 'glacial-sediment-ne-e',
                edges: ['gsnne-gsnee', 'gsnee-gswnw', 'gsnee-kewaunee', 'any-exit'],
                data: {},
                semantics: { label: 'Glacial sediment from the NE and E. Region. Contains Kewaunee, Oak Creek, Holy Hill, Zenda, and Walworth.' },
                spatialProperties: { x: 291, y: 1, width: 177, height: 351 }
            },
            'trade-river': {
                id: 'trade-river', renderId: 'trade-river',
                edges: ['gswnw-trade-river', 'trade-river-pierce', 'trade-river-miller-creek', 'any-exit'],
                data: {},
                semantics: { label: 'Trade River. Till unit. W/NW glacial sediment.' },
                spatialProperties: { x: 42, y: 89, width: 53, height: 32 }
            },
            'pierce': {
                id: 'pierce', renderId: 'pierce',
                edges: ['gswnw-pierce-out', 'trade-river-pierce', 'pierce-marathon', 'pierce-marathon-lr', 'walworth-pierce-lr', 'any-exit'],
                data: {},
                semantics: { label: 'Pierce. Till unit. W/NW glacial sediment.' },
                spatialProperties: { x: 13, y: 291, width: 53, height: 32 }
            },
            'marathon': {
                id: 'marathon', renderId: 'marathon',
                edges: ['gswnw-marathon-out', 'pierce-marathon', 'pierce-marathon-lr', 'marathon-river-falls-lr', 'any-exit'],
                data: {},
                semantics: { label: 'Marathon. Till unit. W/NW glacial sediment.' },
                spatialProperties: { x: 70, y: 291, width: 53, height: 32 }
            },
            'miller-creek': {
                id: 'miller-creek', renderId: 'miller-creek',
                edges: ['gsnne-miller-creek', 'miller-creek-copper-falls', 'trade-river-miller-creek', 'miller-creek-copper-falls-r', 'any-exit'],
                data: {},
                semantics: { label: 'Miller Creek. Till unit. N/NE glacial sediment.' },
                spatialProperties: { x: 165, y: 52, width: 53, height: 32 }
            },
            'copper-falls': {
                id: 'copper-falls', renderId: 'copper-falls',
                edges: ['gsnne-copper-falls-out', 'miller-creek-copper-falls', 'copper-falls-river-falls', 'river-falls-copper-falls-lr', 'copper-falls-kewaunee-lr', 'any-exit'],
                data: {},
                semantics: { label: 'Copper Falls. Till unit. N/NE glacial sediment.' },
                spatialProperties: { x: 222, y: 76, width: 53, height: 176 }
            },
            'river-falls': {
                id: 'river-falls', renderId: 'river-falls',
                edges: ['gsnne-river-falls-out', 'copper-falls-river-falls', 'marathon-river-falls-lr', 'river-falls-copper-falls-lr', 'any-exit'],
                data: {},
                semantics: { label: 'River Falls. Till unit. N/NE glacial sediment.' },
                spatialProperties: { x: 166, y: 220, width: 53, height: 32 }
            },
            'kewaunee': {
                id: 'kewaunee', renderId: 'kewaunee',
                edges: ['gsnee-kewaunee', 'kewaunee-oak-creek', 'copper-falls-kewaunee-lr', 'kewaunee-zenda-r', 'any-exit'],
                data: {},
                semantics: { label: 'Kewaunee. Till unit. NE/E glacial sediment.' },
                spatialProperties: { x: 306, y: 76, width: 94, height: 32 }
            },
            'oak-creek': {
                id: 'oak-creek', renderId: 'oak-creek',
                edges: ['gsnee-oak-creek-out', 'kewaunee-oak-creek', 'oak-creek-holy-hill', 'holy-hill-oak-creek-lr', 'oak-creek-zenda-r', 'any-exit'],
                data: {},
                semantics: { label: 'Oak Creek. Till unit. NE/E glacial sediment.' },
                spatialProperties: { x: 347, y: 113, width: 53, height: 32 }
            },
            'holy-hill': {
                id: 'holy-hill', renderId: 'holy-hill',
                edges: ['gsnee-holy-hill-out', 'oak-creek-holy-hill', 'holy-hill-zenda', 'copper-falls-holy-hill-l', 'holy-hill-oak-creek-lr', 'any-exit'],
                data: {},
                semantics: { label: 'Holy Hill. Till unit. NE/E glacial sediment. L-shaped region.' },
                spatialProperties: {
                    x: 305, y: 113, width: 95, height: 85,
                    path: 'M343.75,112.5V148.5H400.125V197.5H304.875V112.5H343.75Z'
                }
            },
            'zenda': {
                id: 'zenda', renderId: 'zenda',
                edges: ['gsnee-zenda-out', 'holy-hill-zenda', 'zenda-walworth', 'holy-hill-zenda-l', 'zenda-pierce-r', 'any-exit'],
                data: {},
                semantics: { label: 'Zenda. Till unit. NE/E glacial sediment.' },
                spatialProperties: { x: 404, y: 189, width: 53, height: 50 }
            },
            'walworth': {
                id: 'walworth', renderId: 'walworth',
                edges: ['gsnee-walworth-out', 'zenda-walworth', 'holy-hill-walworth-l', 'walworth-pierce-lr', 'any-exit'],
                data: {},
                semantics: { label: 'Walworth. Till unit. NE/E glacial sediment.' },
                spatialProperties: { x: 404, y: 242, width: 53, height: 32 }
            }
        },
        edges: {
            // Top-level: 3 regions, circular left/right
            'gswnw-gsnne': { source: 'glacial-sediment-w-nw', target: 'glacial-sediment-n-ne', navigationRules: ['left', 'right'] },
            'gsnne-gsnee': { source: 'glacial-sediment-n-ne', target: 'glacial-sediment-ne-e', navigationRules: ['left', 'right'] },
            'gsnee-gswnw': { source: 'glacial-sediment-ne-e', target: 'glacial-sediment-w-nw', navigationRules: ['left', 'right'] },
            // Drill-in to first (topmost) child + drill-out from that child
            'gswnw-trade-river':  { source: 'glacial-sediment-w-nw', target: 'trade-river',  navigationRules: ['drill-in', 'drill-out'] },
            'gsnne-miller-creek': { source: 'glacial-sediment-n-ne', target: 'miller-creek',  navigationRules: ['drill-in', 'drill-out'] },
            'gsnee-kewaunee':     { source: 'glacial-sediment-ne-e', target: 'kewaunee',      navigationRules: ['drill-in', 'drill-out'] },
            // Drill-out from non-first children
            'gswnw-pierce-out':       { source: 'glacial-sediment-w-nw', target: 'pierce',       navigationRules: ['drill-out'] },
            'gswnw-marathon-out':     { source: 'glacial-sediment-w-nw', target: 'marathon',      navigationRules: ['drill-out'] },
            'gsnne-copper-falls-out': { source: 'glacial-sediment-n-ne', target: 'copper-falls',  navigationRules: ['drill-out'] },
            'gsnne-river-falls-out':  { source: 'glacial-sediment-n-ne', target: 'river-falls',   navigationRules: ['drill-out'] },
            'gsnee-oak-creek-out':    { source: 'glacial-sediment-ne-e', target: 'oak-creek',     navigationRules: ['drill-out'] },
            'gsnee-holy-hill-out':    { source: 'glacial-sediment-ne-e', target: 'holy-hill',     navigationRules: ['drill-out'] },
            'gsnee-zenda-out':        { source: 'glacial-sediment-ne-e', target: 'zenda',         navigationRules: ['drill-out'] },
            'gsnee-walworth-out':     { source: 'glacial-sediment-ne-e', target: 'walworth',      navigationRules: ['drill-out'] },
            // Within-column up/down
            'trade-river-pierce':        { source: 'trade-river',  target: 'pierce',       navigationRules: ['up', 'down'] },
            'pierce-marathon':           { source: 'pierce',       target: 'marathon',      navigationRules: ['up', 'down'] },
            'miller-creek-copper-falls': { source: 'miller-creek', target: 'copper-falls',  navigationRules: ['up', 'down'] },
            'copper-falls-river-falls':  { source: 'copper-falls', target: 'river-falls',   navigationRules: ['up', 'down'] },
            'kewaunee-oak-creek':        { source: 'kewaunee',     target: 'oak-creek',     navigationRules: ['up', 'down'] },
            'oak-creek-holy-hill':       { source: 'oak-creek',    target: 'holy-hill',     navigationRules: ['up', 'down'] },
            'holy-hill-zenda':           { source: 'holy-hill',    target: 'zenda',         navigationRules: ['up', 'down'] },
            'zenda-walworth':            { source: 'zenda',        target: 'walworth',      navigationRules: ['up', 'down'] },
            // Left/right navigation (explicit adjacency map)
            //   r/l = bidirectional; right only = source → target on →; left only = target → source on ←
            'trade-river-miller-creek':    { source: 'trade-river',  target: 'miller-creek',  navigationRules: ['left', 'right'] }, // r/l
            'pierce-marathon-lr':          { source: 'pierce',       target: 'marathon',       navigationRules: ['left', 'right'] }, // r/l
            'marathon-river-falls-lr':     { source: 'marathon',     target: 'river-falls',    navigationRules: ['left', 'right'] }, // r/l
            'miller-creek-copper-falls-r': { source: 'miller-creek', target: 'copper-falls',   navigationRules: ['right'] },         // right only
            'river-falls-copper-falls-lr': { source: 'river-falls',  target: 'copper-falls',   navigationRules: ['left', 'right'] }, // r/l
            'copper-falls-kewaunee-lr':    { source: 'copper-falls', target: 'kewaunee',       navigationRules: ['left', 'right'] }, // r/l
            'copper-falls-holy-hill-l':    { source: 'copper-falls', target: 'holy-hill',      navigationRules: ['left'] },          // left only (at holy-hill ← → copper-falls)
            'kewaunee-zenda-r':            { source: 'kewaunee',     target: 'zenda',          navigationRules: ['right'] },         // right only
            'holy-hill-oak-creek-lr':      { source: 'holy-hill',    target: 'oak-creek',      navigationRules: ['left', 'right'] }, // r/l
            'oak-creek-zenda-r':           { source: 'oak-creek',    target: 'zenda',          navigationRules: ['right'] },         // right only
            'holy-hill-zenda-l':           { source: 'holy-hill',    target: 'zenda',          navigationRules: ['left'] },          // left only (at zenda ← → holy-hill)
            'zenda-pierce-r':              { source: 'zenda',        target: 'pierce',         navigationRules: ['right'] },         // right only
            'holy-hill-walworth-l':        { source: 'holy-hill',    target: 'walworth',       navigationRules: ['left'] },          // left only (at walworth ← → holy-hill)
            'walworth-pierce-lr':          { source: 'walworth',     target: 'pierce',         navigationRules: ['left', 'right'] }, // r/l
            // Exit
            'any-exit': {
                source: (d, c) => c,
                target: () => { if (exitHandler) exitHandler(); return ''; },
                navigationRules: ['exit']
            }
        },
        navigationRules: {
            left:       { key: 'ArrowLeft',  direction: 'source' },
            right:      { key: 'ArrowRight', direction: 'target' },
            up:         { key: 'ArrowUp',    direction: 'source' },
            down:       { key: 'ArrowDown',  direction: 'target' },
            'drill-in':  { key: 'Enter',     direction: 'target' },
            'drill-out': { key: 'Backspace', direction: 'source' },
            exit:        { key: 'Escape',    direction: 'target' }
        }
    };

    const inspector = Inspector({
        structure,
        container: 'bespoke-inspector',
        size: 300,
        colorBy: 'dimensionLevel',
        edgeExclusions: ['any-exit'],
        nodeInclusions: ['exit']
    });

    let current = null;
    let previous = null;

    const enter = () => {
        const nextNode = input.enter();
        if (nextNode) initiateLifecycle(nextNode);
    };

    const rendering = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-bespoke-node' },
        suffixId: 'bespoke',
        root: {
            id: 'bespoke-wrapper',
            description: 'Stratigraphic chart of glacial till units in Wisconsin. Three columns by sediment source direction, arranged by geological age.',
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
        if (current) { rendering.remove(current); current = null; }
        inspector.clear();
    };

    const input = dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint: 'glacial-sediment-w-nw',
        exitPoint: rendering.exitElement?.id
    });

    const move = direction => {
        const nextNode = input.move(current, direction);
        if (nextNode) initiateLifecycle(nextNode);
    };

    const initiateLifecycle = nextNode => {
        if (previous) rendering.remove(previous);
        const element = rendering.render({ renderId: nextNode.renderId, datum: nextNode });
        element.addEventListener('keydown', e => {
            const direction = input.keydownValidator(e);
            if (direction) { e.preventDefault(); move(direction); }
        });
        element.addEventListener('focus', () => { inspector.highlight(nextNode.renderId); });
        element.addEventListener('blur', () => { inspector.clear(); });
        input.focus(nextNode.renderId);
        previous = current;
        current = nextNode.id;
    };

    cleanup = () => { if (rendering) rendering.clearStructure(); };
});

onUnmounted(() => { if (cleanup) cleanup(); });
</script>

### About This Example

This example demonstrates data-navigator on a bespoke visualization — no charting library involved. The chart is a JPEG image; data-navigator adds an accessible keyboard navigation layer on top of it via an absolutely-positioned HTML overlay inside the same wrapper element.

The navigation structure is defined manually (Static mode — no dimensions API). There are two levels:

**Region level** — the three glacial sediment columns. Left and right navigate between them in a circular chain.

**Formation level** — the geological till units within each column. Up and down navigate within the column (top of screen = source, bottom = target). Left and right cross to the nearest formation in the adjacent column, determined by which formation has the closest vertical center. The columns wrap circularly at this level too.

Because `left`/`right` carry different meaning depending on the current node (region vs. formation), each level has distinct edges — the disambiguation is structural, not conditional: region nodes simply have no cross-column edges in their array.

The `holy-hill` node uses the built-in `spatialProperties.path` feature. Setting a `path` string causes the rendering module to create an SVG overlay that traces the actual L-shape of that formation, so the focus indicator follows the non-rectangular boundary rather than a plain bounding box.

All spatial coordinates are derived by applying a scale factor of `1/8` to the original source SVG (4096×2821). That SVG is not displayed — it was used only to extract the bounding boxes and path shapes of each region. The displayed JPEG is 512×353 px, so every `x`, `y`, `width`, and `height` value — and the path coordinates for `holy-hill` — are original SVG values divided by 8.

## The Complete Code

This code is designed to work **without a bundler**. Run `npm install data-navigator @data-navigator/inspector`, copy the files into a `src/` directory, and open `index.html` in your browser. The HTML uses an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) to resolve bare module specifiers.

If you're using a bundler (Vite, Webpack, etc.), you can simplify the imports to `import dataNavigator from 'data-navigator'` and `import { Inspector } from '@data-navigator/inspector'`, and remove the import map and CDN script tags from the HTML.

The structure is a manually defined two-level hierarchy — three region nodes at the top level, each containing geological formation nodes. `coordinator.js` wires everything together. `structure.js` defines the nodes, edges, and navigation rules. `rendering.js` sets up the accessible HTML overlay. `input.js` creates the keyboard handler.

::: code-group

```js [coordinator.js]
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
```

```js [structure.js]
// All spatial coordinates use scale 1/8 of the original 4096×2821 SVG space.
// Displayed SVG is 512×353 px, so original coords ÷ 8 = CSS pixel position.
//
// Navigation model:
//   Region level  — left/right between the three columns (circular).
//   Formation level — up/down within a column; left/right to the nearest
//     formation in the adjacent column (by vertical center), wrapping circularly.

export const callbacks = { onExit: null };

export const structure = {
    nodes: {
        'glacial-sediment-w-nw': {
            id: 'glacial-sediment-w-nw',
            renderId: 'glacial-sediment-w-nw',
            edges: ['gswnw-gsnne', 'gsnee-gswnw', 'gswnw-trade-river', 'any-exit'],
            data: {},
            semantics: {
                label: 'Glacial sediment from the W and NW. Region. Contains Trade River, Pierce, and Marathon.'
            },
            spatialProperties: { x: 1, y: 1, width: 142, height: 351 }
        },
        'glacial-sediment-n-ne': {
            id: 'glacial-sediment-n-ne',
            renderId: 'glacial-sediment-n-ne',
            edges: ['gswnw-gsnne', 'gsnne-gsnee', 'gsnne-miller-creek', 'any-exit'],
            data: {},
            semantics: {
                label: 'Glacial sediment from the N and NE. Region. Contains Miller Creek, Copper Falls, and River Falls.'
            },
            spatialProperties: { x: 144, y: 1, width: 146, height: 351 }
        },
        'glacial-sediment-ne-e': {
            id: 'glacial-sediment-ne-e',
            renderId: 'glacial-sediment-ne-e',
            edges: ['gsnne-gsnee', 'gsnee-gswnw', 'gsnee-kewaunee', 'any-exit'],
            data: {},
            semantics: {
                label: 'Glacial sediment from the NE and E. Region. Contains Kewaunee, Oak Creek, Holy Hill, Zenda, and Walworth.'
            },
            spatialProperties: { x: 291, y: 1, width: 177, height: 351 }
        },
        'trade-river': {
            id: 'trade-river',
            renderId: 'trade-river',
            edges: ['gswnw-trade-river', 'trade-river-pierce', 'trade-river-miller-creek', 'any-exit'],
            data: {},
            semantics: { label: 'Trade River. Till unit. W/NW glacial sediment.' },
            spatialProperties: { x: 42, y: 89, width: 53, height: 32 }
        },
        pierce: {
            id: 'pierce',
            renderId: 'pierce',
            edges: [
                'gswnw-pierce-out',
                'trade-river-pierce',
                'pierce-marathon',
                'pierce-marathon-lr',
                'walworth-pierce-lr',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Pierce. Till unit. W/NW glacial sediment.' },
            spatialProperties: { x: 13, y: 291, width: 53, height: 32 }
        },
        marathon: {
            id: 'marathon',
            renderId: 'marathon',
            edges: [
                'gswnw-marathon-out',
                'pierce-marathon',
                'pierce-marathon-lr',
                'marathon-river-falls-lr',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Marathon. Till unit. W/NW glacial sediment.' },
            spatialProperties: { x: 70, y: 291, width: 53, height: 32 }
        },
        'miller-creek': {
            id: 'miller-creek',
            renderId: 'miller-creek',
            edges: [
                'gsnne-miller-creek',
                'miller-creek-copper-falls',
                'trade-river-miller-creek',
                'miller-creek-copper-falls-r',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Miller Creek. Till unit. N/NE glacial sediment.' },
            spatialProperties: { x: 165, y: 52, width: 53, height: 32 }
        },
        'copper-falls': {
            id: 'copper-falls',
            renderId: 'copper-falls',
            edges: [
                'gsnne-copper-falls-out',
                'miller-creek-copper-falls',
                'copper-falls-river-falls',
                'river-falls-copper-falls-lr',
                'copper-falls-kewaunee-lr',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Copper Falls. Till unit. N/NE glacial sediment.' },
            spatialProperties: { x: 222, y: 76, width: 53, height: 176 }
        },
        'river-falls': {
            id: 'river-falls',
            renderId: 'river-falls',
            edges: [
                'gsnne-river-falls-out',
                'copper-falls-river-falls',
                'marathon-river-falls-lr',
                'river-falls-copper-falls-lr',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'River Falls. Till unit. N/NE glacial sediment.' },
            spatialProperties: { x: 166, y: 220, width: 53, height: 32 }
        },
        kewaunee: {
            id: 'kewaunee',
            renderId: 'kewaunee',
            edges: ['gsnee-kewaunee', 'kewaunee-oak-creek', 'copper-falls-kewaunee-lr', 'kewaunee-zenda-r', 'any-exit'],
            data: {},
            semantics: { label: 'Kewaunee. Till unit. NE/E glacial sediment.' },
            spatialProperties: { x: 306, y: 76, width: 94, height: 32 }
        },
        'oak-creek': {
            id: 'oak-creek',
            renderId: 'oak-creek',
            edges: [
                'gsnee-oak-creek-out',
                'kewaunee-oak-creek',
                'oak-creek-holy-hill',
                'holy-hill-oak-creek-lr',
                'oak-creek-zenda-r',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Oak Creek. Till unit. NE/E glacial sediment.' },
            spatialProperties: { x: 347, y: 113, width: 53, height: 32 }
        },
        'holy-hill': {
            id: 'holy-hill',
            renderId: 'holy-hill',
            edges: [
                'gsnee-holy-hill-out',
                'oak-creek-holy-hill',
                'holy-hill-zenda',
                'copper-falls-holy-hill-l',
                'holy-hill-oak-creek-lr',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Holy Hill. Till unit. NE/E glacial sediment. L-shaped region.' },
            spatialProperties: {
                x: 305,
                y: 113,
                width: 95,
                height: 85,
                path: 'M343.75,112.5V148.5H400.125V197.5H304.875V112.5H343.75Z'
            }
        },
        zenda: {
            id: 'zenda',
            renderId: 'zenda',
            edges: [
                'gsnee-zenda-out',
                'holy-hill-zenda',
                'zenda-walworth',
                'holy-hill-zenda-l',
                'zenda-pierce-r',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Zenda. Till unit. NE/E glacial sediment.' },
            spatialProperties: { x: 404, y: 189, width: 53, height: 50 }
        },
        walworth: {
            id: 'walworth',
            renderId: 'walworth',
            edges: ['gsnee-walworth-out', 'zenda-walworth', 'holy-hill-walworth-l', 'walworth-pierce-lr', 'any-exit'],
            data: {},
            semantics: { label: 'Walworth. Till unit. NE/E glacial sediment.' },
            spatialProperties: { x: 404, y: 242, width: 53, height: 32 }
        }
    },
    edges: {
        'gswnw-gsnne': {
            source: 'glacial-sediment-w-nw',
            target: 'glacial-sediment-n-ne',
            navigationRules: ['left', 'right']
        },
        'gsnne-gsnee': {
            source: 'glacial-sediment-n-ne',
            target: 'glacial-sediment-ne-e',
            navigationRules: ['left', 'right']
        },
        'gsnee-gswnw': {
            source: 'glacial-sediment-ne-e',
            target: 'glacial-sediment-w-nw',
            navigationRules: ['left', 'right']
        },
        'gswnw-trade-river': {
            source: 'glacial-sediment-w-nw',
            target: 'trade-river',
            navigationRules: ['drill-in', 'drill-out']
        },
        'gsnne-miller-creek': {
            source: 'glacial-sediment-n-ne',
            target: 'miller-creek',
            navigationRules: ['drill-in', 'drill-out']
        },
        'gsnee-kewaunee': {
            source: 'glacial-sediment-ne-e',
            target: 'kewaunee',
            navigationRules: ['drill-in', 'drill-out']
        },
        'gswnw-pierce-out': { source: 'glacial-sediment-w-nw', target: 'pierce', navigationRules: ['drill-out'] },
        'gswnw-marathon-out': { source: 'glacial-sediment-w-nw', target: 'marathon', navigationRules: ['drill-out'] },
        'gsnne-copper-falls-out': {
            source: 'glacial-sediment-n-ne',
            target: 'copper-falls',
            navigationRules: ['drill-out']
        },
        'gsnne-river-falls-out': {
            source: 'glacial-sediment-n-ne',
            target: 'river-falls',
            navigationRules: ['drill-out']
        },
        'gsnee-oak-creek-out': { source: 'glacial-sediment-ne-e', target: 'oak-creek', navigationRules: ['drill-out'] },
        'gsnee-holy-hill-out': { source: 'glacial-sediment-ne-e', target: 'holy-hill', navigationRules: ['drill-out'] },
        'gsnee-zenda-out': { source: 'glacial-sediment-ne-e', target: 'zenda', navigationRules: ['drill-out'] },
        'gsnee-walworth-out': { source: 'glacial-sediment-ne-e', target: 'walworth', navigationRules: ['drill-out'] },
        'trade-river-pierce': { source: 'trade-river', target: 'pierce', navigationRules: ['up', 'down'] },
        'pierce-marathon': { source: 'pierce', target: 'marathon', navigationRules: ['up', 'down'] },
        'miller-creek-copper-falls': {
            source: 'miller-creek',
            target: 'copper-falls',
            navigationRules: ['up', 'down']
        },
        'copper-falls-river-falls': { source: 'copper-falls', target: 'river-falls', navigationRules: ['up', 'down'] },
        'kewaunee-oak-creek': { source: 'kewaunee', target: 'oak-creek', navigationRules: ['up', 'down'] },
        'oak-creek-holy-hill': { source: 'oak-creek', target: 'holy-hill', navigationRules: ['up', 'down'] },
        'holy-hill-zenda': { source: 'holy-hill', target: 'zenda', navigationRules: ['up', 'down'] },
        'zenda-walworth': { source: 'zenda', target: 'walworth', navigationRules: ['up', 'down'] },
        // Left/right navigation (explicit adjacency map)
        //   r/l = bidirectional; right only = source → target on →; left only = target → source on ←
        'trade-river-miller-creek': {
            source: 'trade-river',
            target: 'miller-creek',
            navigationRules: ['left', 'right']
        }, // r/l
        'pierce-marathon-lr': { source: 'pierce', target: 'marathon', navigationRules: ['left', 'right'] }, // r/l
        'marathon-river-falls-lr': { source: 'marathon', target: 'river-falls', navigationRules: ['left', 'right'] }, // r/l
        'miller-creek-copper-falls-r': { source: 'miller-creek', target: 'copper-falls', navigationRules: ['right'] }, // right only
        'river-falls-copper-falls-lr': {
            source: 'river-falls',
            target: 'copper-falls',
            navigationRules: ['left', 'right']
        }, // r/l
        'copper-falls-kewaunee-lr': { source: 'copper-falls', target: 'kewaunee', navigationRules: ['left', 'right'] }, // r/l
        'copper-falls-holy-hill-l': { source: 'copper-falls', target: 'holy-hill', navigationRules: ['left'] }, // left only (at holy-hill ← → copper-falls)
        'kewaunee-zenda-r': { source: 'kewaunee', target: 'zenda', navigationRules: ['right'] }, // right only
        'holy-hill-oak-creek-lr': { source: 'holy-hill', target: 'oak-creek', navigationRules: ['left', 'right'] }, // r/l
        'oak-creek-zenda-r': { source: 'oak-creek', target: 'zenda', navigationRules: ['right'] }, // right only
        'holy-hill-zenda-l': { source: 'holy-hill', target: 'zenda', navigationRules: ['left'] }, // left only (at zenda ← → holy-hill)
        'zenda-pierce-r': { source: 'zenda', target: 'pierce', navigationRules: ['right'] }, // right only
        'walworth-pierce-lr': { source: 'walworth', target: 'pierce', navigationRules: ['left', 'right'] }, // r/l
        'any-exit': {
            source: (d, c) => c,
            target: () => {
                if (callbacks.onExit) callbacks.onExit();
                return '';
            },
            navigationRules: ['exit']
        }
    },
    navigationRules: {
        left: { key: 'ArrowLeft', direction: 'source' },
        right: { key: 'ArrowRight', direction: 'target' },
        up: { key: 'ArrowUp', direction: 'source' },
        down: { key: 'ArrowDown', direction: 'target' },
        'drill-in': { key: 'Enter', direction: 'target' },
        'drill-out': { key: 'Backspace', direction: 'source' },
        exit: { key: 'Escape', direction: 'target' }
    }
};
```

```js [rendering.js]
import dataNavigator from 'data-navigator';

export function createRenderer(structure, onEnter) {
    const renderer = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-bespoke-node' },
        suffixId: 'bespoke',
        root: {
            id: 'bespoke-wrapper',
            description:
                'Stratigraphic chart of glacial till units in Wisconsin. Three columns by sediment source direction, arranged by geological age.',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: onEnter } },
        exitElement: { include: true }
    });
    renderer.initialize();
    return renderer;
}
```

```js [input.js]
import dataNavigator from 'data-navigator';

export function createInput(structure, exitPointId) {
    return dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint: 'glacial-sediment-w-nw',
        exitPoint: exitPointId
    });
}
```

```html [index.html]
<html>
    <head>
        <link rel="stylesheet" href="./src/style.css" />
        <script type="importmap">
            {
                "imports": {
                    "data-navigator": "./node_modules/data-navigator/dist/index.mjs",
                    "@data-navigator/inspector": "./node_modules/@data-navigator/inspector/src/inspector.js",
                    "d3-array": "https://cdn.jsdelivr.net/npm/d3-array@3/+esm",
                    "d3-drag": "https://cdn.jsdelivr.net/npm/d3-drag@3/+esm",
                    "d3-force": "https://cdn.jsdelivr.net/npm/d3-force@3/+esm",
                    "d3-scale": "https://cdn.jsdelivr.net/npm/d3-scale@4/+esm",
                    "d3-scale-chromatic": "https://cdn.jsdelivr.net/npm/d3-scale-chromatic@3/+esm",
                    "d3-selection": "https://cdn.jsdelivr.net/npm/d3-selection@3/+esm"
                }
            }
        </script>
    </head>
    <body>
        <div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
            <div>
                <h3>Stratigraphic Chart</h3>
                <div id="bespoke-wrapper" style="position: relative; display: inline-block;">
                    <img src="bespoke.jpg" aria-hidden="true" alt="" width="512" height="353" style="display: block;" />
                </div>
            </div>
            <div>
                <h3>Structure Inspector</h3>
                <div id="inspector" style="min-height: 350px;"></div>
            </div>
        </div>
    </body>
    <script type="module" src="./src/coordinator.js"></script>
</html>
```

```css [style.css]
.dn-bespoke-node {
    pointer-events: none;
    background: transparent;
    border: none;
    position: absolute;
    margin: 0;
}

.dn-bespoke-node:focus {
    outline: 3px solid #1e3369;
    outline-offset: 2px;
}

.dn-node-path {
    fill: none;
    stroke: #1e3369;
    stroke-width: 3;
}
```

:::

You can also find this example as a ready-to-run project on [GitHub](https://github.com/cmudig/data-navigator/tree/main/assets/bespoke).

<!--

The story for this project has been to make a complex, custom chart navigable using data navigator.

In the first iteration, we designed the chart to be navigable in all directions and focused on a hierarchy that organized each individual element according to the region that a glacial deposit came from. However, we realized that the scientific narrative for this visualization might also serve as a great guideline for creating a navigable experience: describing glacial sediment in Wisconsin through time.

We describe the chart as if we are describing layers of sediment: starting with the top and describing where each layer comes from and during which era it was deposited. This new navigation experience is serial, one direction forward and backward, and doesn't necessarily require data navigator (we could just write an alt document or accompanying layer for this).

But instead, we wanted to couple navigation (that is screen reader accessible as well as accessible via keyboard) to visual captions that change while you navigate. This makes it useful in a classroom, museum, during a talk, or just as a demonstration, as well as an accessible artifact that can live on a website somewhere.

<svg width="4096" height="2821" viewBox="0 0 4096 2821" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="5" y="409" width="3751" height="199" stroke="black" stroke-width="10"/>
<rect x="5" y="618" width="3751" height="47" stroke="black" stroke-width="10"/>
<rect x="5" y="675" width="3751" height="47" stroke="black" stroke-width="10"/>
<rect x="5" y="732" width="3751" height="147" stroke="black" stroke-width="10"/>
<rect x="5" y="889" width="3751" height="275" stroke="black" stroke-width="10"/>
<rect x="5" y="1174" width="3751" height="331" stroke="black" stroke-width="10"/>
<rect x="5" y="1515" width="3751" height="58" stroke="black" stroke-width="10"/>
<rect x="5" y="1576" width="3751" height="177" stroke="black" stroke-width="10"/>
<rect x="5" y="1763" width="3751" height="152" stroke="black" stroke-width="10"/>
<rect x="5" y="1925" width="3751" height="84" stroke="black" stroke-width="10"/>
<rect x="5" y="2019" width="3751" height="166" stroke="black" stroke-width="10"/>
<rect x="5" y="2195" width="3751" height="118" stroke="black" stroke-width="10"/>
<rect x="5" y="2323" width="3751" height="254" stroke="black" stroke-width="10"/>
</svg>
-->
