# Bespoke Visualization Navigation

In this example, we are showing how a project that I worked on for the [Quaternary Geology of Wisconsin](https://data.wgnhs.wisc.edu/statewide-quaternary-online/) evolved in design. In the project, we wanted to add keyboard navigation to a bespoke visualization that accompanies a map. The visualization is a _Correlation of Mapped Formations_ diagram showing mapped formations of glacial sediment in Wisconsin. Our assumptions about what makes a good navigation experience for this visualization changed over our time working together. This example documents that journey, while also demonstrating how one might think about making a bespoke visualization navigable using data navigator (or not!).

The chart is not created using a charting library here in the browser; it is a JPEG image. For this reason (and because it does not necessarily follow a grammar of visualization in its encoding and layout), it requires a manually-defined navigation structure (in other words, we cannot use our dimensions API).

In this example, we demonstrate three different navigation experiences: exploring by sediment source (a two-level hierarchy), navigating through time (a linear story mode), and a combined demo where both modes share one chart. All of the navigation structures were designed manually (in iterations in a design tool, Figma) and then implemented as nodes and edges (also "manually") in Data Navigator.

Take note in the examples below, looking at the structure inspector that follows each chart: there is a complex navigation structure followed by a simple list structure. Thinking about the design of navigation matters, and we hope this example demonstrates that there isn't really a "right" way to create navigation, because sometimes the context or audience depend on different design choices.

## Explore by Sediment Source

Our first design was to organize this visualization to be _explored_. We wanted the user to meander through the data displayed, discovering the layout through sediment source.

Navigate the chart as a two-level hierarchy: three glacial sediment source regions at the top level, each containing geological formations. Left and right navigate between regions; up and down navigate within a column; left and right at the formation level cross to the nearest formation in the adjacent column.

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

### Correlation of Mapped Formations

<br>

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <div id="bespoke-wrapper" style="position: relative; display: inline-block;">
            <img src="/bespoke.jpg" aria-hidden="true" alt="" width="512" height="353" style="display: block;">
        </div>
    </div>
    <div>
        <h3>Structure Inspector</h3>
        <div id="bespoke-inspector" style="min-height: 350px;"></div>
    </div>
</div>

## Navigating as a Story, through Time

In the first iteration, we designed the chart to be navigable in all directions and focused on a hierarchy that organized each individual element according to the region that a glacial deposit came from. However, we realized that the scientific narrative for this visualization might also serve as a great guideline for creating a navigable experience: describing glacial sediment in Wisconsin through time.

My research partner, a geologist and mapping specialist, talked me through how one might "explain" this graphic to someone. We use this explanation as a foundation for a navigation experience.

So first, we describe the chart as if we are describing layers of sediment, starting with the top and describing where each layer comes from and during which era it was deposited. This means we navigate top to bottom, one "slice" at a time.

Notably, this new navigation experience is serial, one direction forward and backward. That means that it doesn't necessarily require data navigator (we could just write an alt document or a few paragraphs underneath).

However, we wanted to couple navigation (screen reader accessible as well as keyboard accessible) to visual captions that change while you navigate. This makes our demo useful in a classroom, museum, during a talk, or just as a demonstration, as well as an accessible artifact that can live on a website.

### Keyboard Controls

| Command                              | Key                                         |
| ------------------------------------ | ------------------------------------------- |
| Enter the structure                  | Activate the "Enter navigation area" button |
| Navigate forward (down through time) | <kbd>↓</kbd>                                |
| Navigate backward (up through time)  | <kbd>↑</kbd>                                |
| Exit                                 | <kbd>Esc</kbd>                              |

### Correlation of Mapped Formations

<br>

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <div id="story-wrapper" style="position: relative; display: inline-block;">
            <img src="/bespoke.jpg" aria-hidden="true" alt="" width="512" height="353" style="display: block;">
        </div>
        <div id="story-caption" role="status" aria-live="polite" style="margin-top: 0.75rem; min-height: 3em; max-width: 512px; padding: 0.75rem; background: var(--vp-c-bg-soft); border-radius: 6px; border: 1px solid var(--vp-c-divider);">
            Navigate through the layers to explore the geological history of Wisconsin.
        </div>
    </div>
    <div>
        <h3>Structure Inspector</h3>
        <div id="story-inspector" style="min-height: 350px;"></div>
    </div>
</div>

## Combined Navigation

In our final example, we combine both navigation designs. The goal here is that some users may want to navigate a story of the correlation of formations, while in other contexts or other users may want to explore the data's arrangement in a more structural way, organized by the sediment source instead.

Both navigation modes below applied to one shared chart. Two entry buttons appear inside the chart wrapper: one for source-based navigation, one for time-based navigation. Activating one deactivates the other. The caption updates based on whichever mode is active.

### Keyboard Controls

| Mode        | Command                                  | Key                                              |
| ----------- | ---------------------------------------- | ------------------------------------------------ |
| Both        | Enter a mode                             | Activate the mode's entry button                 |
| Both        | Exit                                     | <kbd>Esc</kbd>                                   |
| Source mode | Previous / next region                   | <kbd>←</kbd> / <kbd>→</kbd>                      |
| Source mode | Up / down within a column                | <kbd>↑</kbd> / <kbd>↓</kbd>                      |
| Source mode | Cross to adjacent column                 | <kbd>←</kbd> / <kbd>→</kbd> (at formation level) |
| Source mode | Drill into / out of region               | <kbd>Enter</kbd> / <kbd>Backspace</kbd>          |
| Time mode   | Navigate forward / backward through time | <kbd>↓</kbd> / <kbd>↑</kbd>                      |

### Correlation of Mapped Formations

<br>

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <div id="unified-wrapper" style="position: relative; display: inline-block;">
            <img src="/bespoke.jpg" aria-hidden="true" alt="" width="512" height="353" style="display: block;">
        </div>
        <div id="unified-caption" role="status" aria-live="polite" style="margin-top: 0.75rem; min-height: 3em; max-width: 512px; padding: 0.75rem; background: var(--vp-c-bg-soft); border-radius: 6px; border: 1px solid var(--vp-c-divider);">
            Choose a navigation mode above to begin.
        </div>
    </div>
</div>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const showControls = ref(true);
let cleanup = null;

onMounted(async () => {
    const { default: dataNavigator } = await import('data-navigator');
    const { Inspector } = await import('@data-navigator/inspector');

    // ── Demo 1: Explore by sediment source ───────────────────────────────────
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
                semantics: { label: 'Trade River. Sediment from W/NW, deposited towards the end of the Wisconsin glaciation during the Pleistocene Epoch.' },
                spatialProperties: { x: 42, y: 89, width: 53, height: 32 }
            },
            'pierce': {
                id: 'pierce', renderId: 'pierce',
                edges: ['gswnw-pierce-out', 'trade-river-pierce', 'pierce-marathon', 'pierce-marathon-lr', 'walworth-pierce-lr', 'any-exit'],
                data: {},
                semantics: { label: 'Pierce. Sediment from W/NW, deposited by the Pre-Illinoian glaciation during the Pleistocene Epoch.' },
                spatialProperties: { x: 13, y: 291, width: 53, height: 32 }
            },
            'marathon': {
                id: 'marathon', renderId: 'marathon',
                edges: ['gswnw-marathon-out', 'pierce-marathon', 'pierce-marathon-lr', 'marathon-river-falls-lr', 'any-exit'],
                data: {},
                semantics: { label: 'Marathon. Sediment from W/NW, deposited by the Pre-Illinoian glaciation during the Pleistocene Epoch.' },
                spatialProperties: { x: 70, y: 291, width: 53, height: 32 }
            },
            'miller-creek': {
                id: 'miller-creek', renderId: 'miller-creek',
                edges: ['gsnne-miller-creek', 'miller-creek-copper-falls', 'trade-river-miller-creek', 'miller-creek-copper-falls-r', 'any-exit'],
                data: {},
                semantics: { label: 'Miller Creek. Top-most sediment from N/NE, deposited at the end of the Wisconsin glaciation during the Pleistocene Epoch and also deposited during the early Holocene Epoch.' },
                spatialProperties: { x: 165, y: 52, width: 53, height: 32 }
            },
            'copper-falls': {
                id: 'copper-falls', renderId: 'copper-falls',
                edges: ['gsnne-copper-falls-out', 'miller-creek-copper-falls', 'copper-falls-river-falls', 'river-falls-copper-falls-lr', 'copper-falls-kewaunee-lr', 'any-exit'],
                data: {},
                semantics: { label: 'Copper Falls. Sediment from N/NE, deposited from the middle of the Illinoian glaciation until the end of the Wisconsin glaciation during the Pleistocene Epoch.' },
                spatialProperties: { x: 222, y: 76, width: 53, height: 176 }
            },
            'river-falls': {
                id: 'river-falls', renderId: 'river-falls',
                edges: ['gsnne-river-falls-out', 'copper-falls-river-falls', 'marathon-river-falls-lr', 'river-falls-copper-falls-lr', 'any-exit'],
                data: {},
                semantics: { label: 'River Falls. Sediment from N/NE, deposited later by the Illinoian glaciation during the Pleistocene Epoch.' },
                spatialProperties: { x: 166, y: 220, width: 53, height: 32 }
            },
            'kewaunee': {
                id: 'kewaunee', renderId: 'kewaunee',
                edges: ['gsnee-kewaunee', 'kewaunee-oak-creek', 'copper-falls-kewaunee-lr', 'kewaunee-zenda-r', 'any-exit'],
                data: {},
                semantics: { label: 'Kewaunee. Sediment from NE/E, deposited at the end of the Wisconsin glaciation during the Pleistocene Epoch.' },
                spatialProperties: { x: 306, y: 76, width: 94, height: 32 }
            },
            'oak-creek': {
                id: 'oak-creek', renderId: 'oak-creek',
                edges: ['gsnee-oak-creek-out', 'kewaunee-oak-creek', 'oak-creek-holy-hill', 'holy-hill-oak-creek-lr', 'oak-creek-zenda-r', 'any-exit'],
                data: {},
                semantics: { label: 'Oak Creek. Sediment from NE/E, deposited in the middle of the Wisconsin glaciation during the Pleistocene Epoch.' },
                spatialProperties: { x: 347, y: 113, width: 53, height: 32 }
            },
            'holy-hill': {
                id: 'holy-hill', renderId: 'holy-hill',
                edges: ['gsnee-holy-hill-out', 'oak-creek-holy-hill', 'holy-hill-zenda', 'copper-falls-holy-hill-l', 'holy-hill-oak-creek-lr', 'any-exit'],
                data: {},
                semantics: { label: 'Holy Hill. Sediment from NE/E, deposited from early until after the middle of the Wisconsin glaciation, during the Pleistocene Epoch. Oak Creek was deposited alongside during the later half.' },
                spatialProperties: {
                    x: 305, y: 113, width: 95, height: 85,
                    path: 'M347.75,109.5V144.5H403.125V200.5H301.875V109.5H347.75Z'
                }
            },
            'zenda': {
                id: 'zenda', renderId: 'zenda',
                edges: ['gsnee-zenda-out', 'holy-hill-zenda', 'zenda-walworth', 'holy-hill-zenda-l', 'zenda-pierce-r', 'any-exit'],
                data: {},
                semantics: { label: 'Zenda. Sediment from NE/E, deposited in during late Illinoian and early Wisconsin glaciations during the Pleistocene Epoch.' },
                spatialProperties: { x: 404, y: 189, width: 53, height: 50 }
            },
            'walworth': {
                id: 'walworth', renderId: 'walworth',
                edges: ['gsnee-walworth-out', 'zenda-walworth', 'holy-hill-walworth-l', 'walworth-pierce-lr', 'any-exit'],
                data: {},
                semantics: { label: 'Walworth. Sediment from NE/E, deposited in the middle of the Illinoian glaciation during the Pleistocene Epoch.' },
                spatialProperties: { x: 404, y: 242, width: 53, height: 32 }
            }
        },
        edges: {
            'gswnw-gsnne': { source: 'glacial-sediment-w-nw', target: 'glacial-sediment-n-ne', navigationRules: ['left', 'right'] },
            'gsnne-gsnee': { source: 'glacial-sediment-n-ne', target: 'glacial-sediment-ne-e', navigationRules: ['left', 'right'] },
            'gsnee-gswnw': { source: 'glacial-sediment-ne-e', target: 'glacial-sediment-w-nw', navigationRules: ['left', 'right'] },
            'gswnw-trade-river':  { source: 'glacial-sediment-w-nw', target: 'trade-river',  navigationRules: ['drill-in', 'drill-out'] },
            'gsnne-miller-creek': { source: 'glacial-sediment-n-ne', target: 'miller-creek',  navigationRules: ['drill-in', 'drill-out'] },
            'gsnee-kewaunee':     { source: 'glacial-sediment-ne-e', target: 'kewaunee',      navigationRules: ['drill-in', 'drill-out'] },
            'gswnw-pierce-out':       { source: 'glacial-sediment-w-nw', target: 'pierce',       navigationRules: ['drill-out'] },
            'gswnw-marathon-out':     { source: 'glacial-sediment-w-nw', target: 'marathon',      navigationRules: ['drill-out'] },
            'gsnne-copper-falls-out': { source: 'glacial-sediment-n-ne', target: 'copper-falls',  navigationRules: ['drill-out'] },
            'gsnne-river-falls-out':  { source: 'glacial-sediment-n-ne', target: 'river-falls',   navigationRules: ['drill-out'] },
            'gsnee-oak-creek-out':    { source: 'glacial-sediment-ne-e', target: 'oak-creek',     navigationRules: ['drill-out'] },
            'gsnee-holy-hill-out':    { source: 'glacial-sediment-ne-e', target: 'holy-hill',     navigationRules: ['drill-out'] },
            'gsnee-zenda-out':        { source: 'glacial-sediment-ne-e', target: 'zenda',         navigationRules: ['drill-out'] },
            'gsnee-walworth-out':     { source: 'glacial-sediment-ne-e', target: 'walworth',      navigationRules: ['drill-out'] },
            'trade-river-pierce':        { source: 'trade-river',  target: 'pierce',       navigationRules: ['up', 'down'] },
            'pierce-marathon':           { source: 'pierce',       target: 'marathon',      navigationRules: ['up', 'down'] },
            'miller-creek-copper-falls': { source: 'miller-creek', target: 'copper-falls',  navigationRules: ['up', 'down'] },
            'copper-falls-river-falls':  { source: 'copper-falls', target: 'river-falls',   navigationRules: ['up', 'down'] },
            'kewaunee-oak-creek':        { source: 'kewaunee',     target: 'oak-creek',     navigationRules: ['up', 'down'] },
            'oak-creek-holy-hill':       { source: 'oak-creek',    target: 'holy-hill',     navigationRules: ['up', 'down'] },
            'holy-hill-zenda':           { source: 'holy-hill',    target: 'zenda',         navigationRules: ['up', 'down'] },
            'zenda-walworth':            { source: 'zenda',        target: 'walworth',      navigationRules: ['up', 'down'] },
            'trade-river-miller-creek':    { source: 'trade-river',  target: 'miller-creek',  navigationRules: ['left', 'right'] },
            'pierce-marathon-lr':          { source: 'pierce',       target: 'marathon',       navigationRules: ['left', 'right'] },
            'marathon-river-falls-lr':     { source: 'marathon',     target: 'river-falls',    navigationRules: ['left', 'right'] },
            'miller-creek-copper-falls-r': { source: 'miller-creek', target: 'copper-falls',   navigationRules: ['right'] },
            'river-falls-copper-falls-lr': { source: 'river-falls',  target: 'copper-falls',   navigationRules: ['left', 'right'] },
            'copper-falls-kewaunee-lr':    { source: 'copper-falls', target: 'kewaunee',       navigationRules: ['left', 'right'] },
            'copper-falls-holy-hill-l':    { source: 'copper-falls', target: 'holy-hill',      navigationRules: ['left'] },
            'kewaunee-zenda-r':            { source: 'kewaunee',     target: 'zenda',          navigationRules: ['right'] },
            'holy-hill-oak-creek-lr':      { source: 'holy-hill',    target: 'oak-creek',      navigationRules: ['left', 'right'] },
            'oak-creek-zenda-r':           { source: 'oak-creek',    target: 'zenda',          navigationRules: ['right'] },
            'holy-hill-zenda-l':           { source: 'holy-hill',    target: 'zenda',          navigationRules: ['left'] },
            'zenda-pierce-r':              { source: 'zenda',        target: 'pierce',         navigationRules: ['right'] },
            'holy-hill-walworth-l':        { source: 'holy-hill',    target: 'walworth',       navigationRules: ['left'] },
            'walworth-pierce-lr':          { source: 'walworth',     target: 'pierce',         navigationRules: ['left', 'right'] },
            'any-exit': {
                source: (d, c) => c,
                target: () => { if (exitHandler) exitHandler(); return ''; },
                navigationRules: ['exit']
            }
        },
        navigationRules: {
            left:        { key: 'ArrowLeft',  direction: 'source' },
            right:       { key: 'ArrowRight', direction: 'target' },
            up:          { key: 'ArrowUp',    direction: 'source' },
            down:        { key: 'ArrowDown',  direction: 'target' },
            'drill-in':  { key: 'Enter',      direction: 'target' },
            'drill-out': { key: 'Backspace',  direction: 'source' },
            exit:        { key: 'Escape',     direction: 'target' }
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
            description: 'Correlation of Mapped Formations showing the time period of deposition for each mapped formation of glacial sediment in Wisconsin. Three columns by sediment source direction, arranged by geological age.',
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

    // ── Demo 2: Story mode — navigate through time ────────────────────────────
    let storyExitHandler = null;
    let storyCurrent = null;
    let storyPrevious = null;

    const storyStructure = {
        nodes: {
            'st-01': {
                id: 'st-01', renderId: 'st-01',
                edges: ['st-01-02', 'st-exit'],
                data: {},
                semantics: { label: 'Layer 1 of 13. The youngest, topmost glacial deposit from the end of the Pleistocene into the Holocene Epoch. Only Miller Creek is present, deposited from the N/NE.' },
                spatialProperties: { x: 6, y: 56, width: 459, height: 15 }
            },
            'st-02': {
                id: 'st-02', renderId: 'st-02',
                edges: ['st-01-02', 'st-02-03', 'st-exit'],
                data: {},
                semantics: { label: 'Miller Creek and Copper Falls are deposited from the N/NE and Kewaunee is deposited from the NE/E. Close to the very end of the Wisconsin glaciation during the Pleistocene Epoch. Layer 2 of 13.' },
                spatialProperties: { x: 6, y: 82, width: 459, height: 1 }
            },
            'st-03': {
                id: 'st-03', renderId: 'st-03',
                edges: ['st-02-03', 'st-03-04', 'st-exit'],
                data: {},
                semantics: { label: 'Copper Falls is deposited from the N/NE and Kewaunee is deposited from the NE/E. Close to the end of the Wisconsin glaciation during the Pleistocene Epoch. Layer 3 of 13.' },
                spatialProperties: { x: 6, y: 89, width: 459, height: 1 }
            },
            'st-04': {
                id: 'st-04', renderId: 'st-04',
                edges: ['st-03-04', 'st-04-05', 'st-exit'],
                data: {},
                semantics: { label: 'Trade River is deposited from the W/NW, Copper Falls is deposited from the N/NE, and Kewaunee is deposited from the NE/E. In the final quarter of the Wisconsin glaciation during the Pleistocene Epoch. Layer 4 of 13.' },
                spatialProperties: { x: 6, y: 97, width: 459, height: 8 }
            },
            'st-05': {
                id: 'st-05', renderId: 'st-05',
                edges: ['st-04-05', 'st-05-06', 'st-exit'],
                data: {},
                semantics: { label: 'Trade River is deposited from the W/NW, Copper Falls is deposited from the N/NE, and Holy Hill and Oak Creek is deposited from the NE/E. In the later middle of the Wisconsin glaciation during the Pleistocene Epoch. Layer 5 of 13.' },
                spatialProperties: { x: 6, y: 116, width: 459, height: 24 }
            },
            'st-06': {
                id: 'st-06', renderId: 'st-06',
                edges: ['st-05-06', 'st-06-07', 'st-exit'],
                data: {},
                semantics: { label: 'Copper Falls is deposited from the N/NE and Holy Hill is deposited from the NE/E. In the earlier middle of the Wisconsin glaciation during the Pleistocene Epoch. Layer 6 of 13.' },
                spatialProperties: { x: 6, y: 152, width: 459, height: 31 }
            },
            'st-07': {
                id: 'st-07', renderId: 'st-07',
                edges: ['st-06-07', 'st-07-08', 'st-exit'],
                data: {},
                semantics: { label: 'Copper Falls is deposited from the N/NE and Holy Hill and Zenda is deposited from the NE/E. Close to the start of the Wisconsin glaciation during the Pleistocene Epoch. Layer 7 of 13.' },
                spatialProperties: { x: 6, y: 194, width: 459, height: 1 }
            },
            'st-08': {
                id: 'st-08', renderId: 'st-08',
                edges: ['st-07-08', 'st-08-09', 'st-exit'],
                data: {},
                semantics: { label: 'Copper Falls is deposited from the N/NE and Zenda is deposited from the NE/E. At the start of the Wisconsin glaciation during the Pleistocene Epoch. Layer 8 of 13.' },
                spatialProperties: { x: 6, y: 202, width: 459, height: 12 }
            },
            'st-09': {
                id: 'st-09', renderId: 'st-09',
                edges: ['st-08-09', 'st-09-10', 'st-exit'],
                data: {},
                semantics: { label: 'River Falls and Copper Falls is deposited from the N/NE and Zenda is deposited from the NE/E. At the end of the Illinoian glaciation during the Pleistocene Epoch. Layer 9 of 13.' },
                spatialProperties: { x: 6, y: 225, width: 459, height: 9 }
            },
            'st-10': {
                id: 'st-10', renderId: 'st-10',
                edges: ['st-09-10', 'st-10-11', 'st-exit'],
                data: {},
                semantics: { label: 'River Falls and Copper Falls is deposited from the N/NE and Walworth is deposited from the NE/E. In the middle of the Illinoian glaciation during the Pleistocene Epoch. Layer 10 of 13.' },
                spatialProperties: { x: 6, y: 246, width: 459, height: 1 }
            },
            'st-11': {
                id: 'st-11', renderId: 'st-11',
                edges: ['st-10-11', 'st-11-12', 'st-exit'],
                data: {},
                semantics: { label: 'Walworth is deposited from the NE/E. Near the beginning of the Illinoian glaciation during the Pleistocene Epoch. Layer 11 of 13.' },
                spatialProperties: { x: 6, y: 257, width: 459, height: 11 }
            },
            'st-12': {
                id: 'st-12', renderId: 'st-12',
                edges: ['st-11-12', 'st-12-13', 'st-exit'],
                data: {},
                semantics: { label: 'No deposits. At the start of the Illinoian glaciation. Layer 12 of 13.' },
                spatialProperties: { x: 6, y: 279, width: 459, height: 5 }
            },
            'st-13': {
                id: 'st-13', renderId: 'st-13',
                edges: ['st-12-13', 'st-exit'],
                data: {},
                semantics: { label: 'Pierce and Marathon are deposited from the NE/E. At the end of the Pre-Illinoian glaciation during the Pleistocene Epoch. Layer 13 of 13, the bottommost layer.' },
                spatialProperties: { x: 6, y: 295, width: 459, height: 22 }
            }
        },
        edges: {
            'st-01-02': { source: 'st-01', target: 'st-02', navigationRules: ['up', 'down'] },
            'st-02-03': { source: 'st-02', target: 'st-03', navigationRules: ['up', 'down'] },
            'st-03-04': { source: 'st-03', target: 'st-04', navigationRules: ['up', 'down'] },
            'st-04-05': { source: 'st-04', target: 'st-05', navigationRules: ['up', 'down'] },
            'st-05-06': { source: 'st-05', target: 'st-06', navigationRules: ['up', 'down'] },
            'st-06-07': { source: 'st-06', target: 'st-07', navigationRules: ['up', 'down'] },
            'st-07-08': { source: 'st-07', target: 'st-08', navigationRules: ['up', 'down'] },
            'st-08-09': { source: 'st-08', target: 'st-09', navigationRules: ['up', 'down'] },
            'st-09-10': { source: 'st-09', target: 'st-10', navigationRules: ['up', 'down'] },
            'st-10-11': { source: 'st-10', target: 'st-11', navigationRules: ['up', 'down'] },
            'st-11-12': { source: 'st-11', target: 'st-12', navigationRules: ['up', 'down'] },
            'st-12-13': { source: 'st-12', target: 'st-13', navigationRules: ['up', 'down'] },
            'st-exit': {
                source: (d, c) => c,
                target: () => { if (storyExitHandler) storyExitHandler(); return ''; },
                navigationRules: ['exit']
            }
        },
        navigationRules: {
            up:   { key: 'ArrowUp',   direction: 'source' },
            down: { key: 'ArrowDown', direction: 'target' },
            exit: { key: 'Escape',    direction: 'target' }
        }
    };

    const storyInspector = Inspector({
        structure: storyStructure,
        container: 'story-inspector',
        size: 300,
        colorBy: 'dimensionLevel',
        edgeExclusions: ['st-exit'],
        nodeInclusions: ['exit']
    });

    const storyCaptionEl = document.getElementById('story-caption');

    let storyInput;

    const storyEnter = () => {
        const nextNode = storyInput.enter();
        if (nextNode) storyLifecycle(nextNode);
    };

    const storyRendering = dataNavigator.rendering({
        elementData: storyStructure.nodes,
        defaults: { cssClass: 'dn-story-node' },
        suffixId: 'story',
        root: {
            id: 'story-wrapper',
            description: 'Correlation of Mapped Formations showing the time period of deposition for each mapped formation of glacial sediment through time in Wisconsin.',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: storyEnter } },
        exitElement: { include: true }
    });
    storyRendering.initialize();

    storyExitHandler = () => {
        storyRendering.exitElement.style.display = 'block';
        storyInput.focus(storyRendering.exitElement.id);
        if (storyCurrent) { storyRendering.remove(storyCurrent); storyCurrent = null; }
        storyInspector.clear();
        if (storyCaptionEl) storyCaptionEl.textContent = '';
    };

    storyInput = dataNavigator.input({
        structure: storyStructure,
        navigationRules: storyStructure.navigationRules,
        entryPoint: 'st-01',
        exitPoint: storyRendering.exitElement?.id
    });

    const storyMove = direction => {
        const nextNode = storyInput.move(storyCurrent, direction);
        if (nextNode) storyLifecycle(nextNode);
    };

    const storyLifecycle = nextNode => {
        if (storyPrevious) storyRendering.remove(storyPrevious);
        const element = storyRendering.render({ renderId: nextNode.renderId, datum: nextNode });
        element.addEventListener('keydown', e => {
            const direction = storyInput.keydownValidator(e);
            if (direction) { e.preventDefault(); storyMove(direction); }
        });
        element.addEventListener('focus', () => {
            storyInspector.highlight(nextNode.renderId);
            if (storyCaptionEl) storyCaptionEl.textContent = nextNode.semantics.label;
        });
        element.addEventListener('blur', () => { storyInspector.clear(); });
        storyInput.focus(nextNode.renderId);
        storyPrevious = storyCurrent;
        storyCurrent = nextNode.id;
    };

    // ── Demo 3: Combined navigation ───────────────────────────────────────────
    let unifiedSourceExitHandler = null;
    let unifiedTimeExitHandler   = null;
    let unifiedSourceCurrent = null, unifiedSourcePrevious = null;
    let unifiedTimeCurrent   = null, unifiedTimePrevious   = null;

    const unifiedCaptionEl = document.getElementById('unified-caption');

    // Shallow-copy edges so each rendering has its own independent exit handler
    const unifiedSourceEdges = {
        ...structure.edges,
        'any-exit': {
            source: (d, c) => c,
            target: () => { if (unifiedSourceExitHandler) unifiedSourceExitHandler(); return ''; },
            navigationRules: ['exit']
        }
    };
    const unifiedSourceStructure = { ...structure, edges: unifiedSourceEdges };

    const unifiedTimeEdges = {
        ...storyStructure.edges,
        'st-exit': {
            source: (d, c) => c,
            target: () => { if (unifiedTimeExitHandler) unifiedTimeExitHandler(); return ''; },
            navigationRules: ['exit']
        }
    };
    const unifiedTimeStructure = { ...storyStructure, edges: unifiedTimeEdges };

    // --- Time mode ---
    let unifiedTimeInput;

    const enterUnifiedTime = () => {
        if (unifiedSourceCurrent) {
            unifiedSourceRendering.remove(unifiedSourceCurrent);
            unifiedSourceCurrent = null; unifiedSourcePrevious = null;
        }
        if (unifiedSourceRendering.exitElement) unifiedSourceRendering.exitElement.style.display = 'none';
        const nextNode = unifiedTimeInput.enter();
        if (nextNode) unifiedTimeLifecycle(nextNode);
    };

    const unifiedTimeRendering = dataNavigator.rendering({
        elementData: storyStructure.nodes,
        defaults: { cssClass: 'dn-story-node' },
        suffixId: 'unified-time',
        root: {
            id: 'unified-wrapper',
            description: 'Correlation of Mapped Formations showing the time period of deposition for each mapped formation of glacial sediment through time in Wisconsin.',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: enterUnifiedTime } },
        exitElement: { include: true }
    });
    unifiedTimeRendering.initialize();
    unifiedTimeRendering.entryButton.innerText = 'Navigate sediment by time';

    unifiedTimeExitHandler = () => {
        unifiedTimeRendering.exitElement.style.display = 'block';
        unifiedTimeInput.focus(unifiedTimeRendering.exitElement.id);
        if (unifiedTimeCurrent) { unifiedTimeRendering.remove(unifiedTimeCurrent); unifiedTimeCurrent = null; }
        if (unifiedCaptionEl) unifiedCaptionEl.textContent = '';
    };

    unifiedTimeInput = dataNavigator.input({
        structure: unifiedTimeStructure,
        navigationRules: unifiedTimeStructure.navigationRules,
        entryPoint: 'st-01',
        exitPoint: unifiedTimeRendering.exitElement?.id
    });

    const unifiedTimeMove = direction => {
        const nextNode = unifiedTimeInput.move(unifiedTimeCurrent, direction);
        if (nextNode) unifiedTimeLifecycle(nextNode);
    };

    const unifiedTimeLifecycle = nextNode => {
        if (unifiedTimePrevious) unifiedTimeRendering.remove(unifiedTimePrevious);
        const element = unifiedTimeRendering.render({ renderId: nextNode.renderId, datum: nextNode });
        element.addEventListener('keydown', e => {
            const direction = unifiedTimeInput.keydownValidator(e);
            if (direction) { e.preventDefault(); unifiedTimeMove(direction); }
        });
        element.addEventListener('focus', () => {
            if (unifiedCaptionEl) unifiedCaptionEl.textContent = nextNode.semantics.label;
        });
        unifiedTimeInput.focus(nextNode.renderId);
        unifiedTimePrevious = unifiedTimeCurrent;
        unifiedTimeCurrent  = nextNode.id;
    };

    // --- Source mode ---
    let unifiedSourceInput;

    const enterUnifiedSource = () => {
        if (unifiedTimeCurrent) {
            unifiedTimeRendering.remove(unifiedTimeCurrent);
            unifiedTimeCurrent = null; unifiedTimePrevious = null;
        }
        if (unifiedTimeRendering.exitElement) unifiedTimeRendering.exitElement.style.display = 'none';
        const nextNode = unifiedSourceInput.enter();
        if (nextNode) unifiedSourceLifecycle(nextNode);
    };

    const unifiedSourceRendering = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-bespoke-node' },
        suffixId: 'unified-source',
        root: {
            id: 'unified-wrapper',
            description: 'Correlation of Mapped Formations showing the time period of deposition for each mapped formation of glacial sediment in Wisconsin. Three columns by sediment source direction.',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: enterUnifiedSource } },
        exitElement: { include: true }
    });
    unifiedSourceRendering.initialize();
    unifiedSourceRendering.entryButton.innerText = 'Explore sediment by source';

    unifiedSourceExitHandler = () => {
        unifiedSourceRendering.exitElement.style.display = 'block';
        unifiedSourceInput.focus(unifiedSourceRendering.exitElement.id);
        if (unifiedSourceCurrent) { unifiedSourceRendering.remove(unifiedSourceCurrent); unifiedSourceCurrent = null; }
        if (unifiedCaptionEl) unifiedCaptionEl.textContent = '';
    };

    unifiedSourceInput = dataNavigator.input({
        structure: unifiedSourceStructure,
        navigationRules: unifiedSourceStructure.navigationRules,
        entryPoint: 'glacial-sediment-w-nw',
        exitPoint: unifiedSourceRendering.exitElement?.id
    });

    const unifiedSourceMove = direction => {
        const nextNode = unifiedSourceInput.move(unifiedSourceCurrent, direction);
        if (nextNode) unifiedSourceLifecycle(nextNode);
    };

    const unifiedSourceLifecycle = nextNode => {
        if (unifiedSourcePrevious) unifiedSourceRendering.remove(unifiedSourcePrevious);
        const element = unifiedSourceRendering.render({ renderId: nextNode.renderId, datum: nextNode });
        element.addEventListener('keydown', e => {
            const direction = unifiedSourceInput.keydownValidator(e);
            if (direction) { e.preventDefault(); unifiedSourceMove(direction); }
        });
        element.addEventListener('focus', () => {
            if (unifiedCaptionEl) unifiedCaptionEl.textContent = nextNode.semantics.label;
        });
        unifiedSourceInput.focus(nextNode.renderId);
        unifiedSourcePrevious = unifiedSourceCurrent;
        unifiedSourceCurrent  = nextNode.id;
    };

    cleanup = () => {
        if (rendering) rendering.clearStructure();
        if (storyRendering) storyRendering.clearStructure();
        if (unifiedSourceRendering) unifiedSourceRendering.clearStructure();
        if (unifiedTimeRendering) unifiedTimeRendering.clearStructure();
    };
});

onUnmounted(() => { if (cleanup) cleanup(); });
</script>

### About This Example

This example demonstrates data-navigator on a bespoke visualization, no charting library involved. The chart is a JPEG image; data-navigator adds an accessible keyboard navigation layer on top of it via an absolutely-positioned HTML overlay inside the same wrapper element.

The navigation structure is defined manually (it does not use the dimensions API). There are two levels:

**Region level**: the three glacial sediment columns. Left and right navigate between them in a circular chain.

**Formation level**: the geological till units within each column. Up and down navigate within the column (top of screen = source, bottom = target). Left and right cross to the nearest formation in the adjacent column, determined by which formation has the closest vertical center. The columns wrap circularly at this level too.

Because `left`/`right` carry different meaning depending on the current node (region vs. formation), each level has distinct edges. The disambiguation is structural, not conditional: region nodes simply have no cross-column edges in their array. In the project _Benthic_ by researchers at MIT, this is referred to as navigation based on _visual congruence_ [[1](https://vis.csail.mit.edu/pubs/benthic/)].

The `holy-hill` node uses the built-in `spatialProperties.path` feature. Setting a `path` string causes the rendering module to create an SVG overlay that traces the actual L-shape of that formation, so the focus indicator follows the non-rectangular boundary rather than a plain bounding box.

The combined demo (§3) uses **shallow-copied edge objects** to give each rendering its own independent exit handler without duplicating any node data. The pattern is `{ ...structure.edges, 'any-exit': { ...newHandler } }` and then `{ ...structure, edges: shallowCopiedEdges }`. The nodes object is shared by reference across all three renderings.

<!-- All spatial coordinates are derived by applying a scale factor of `1/8` to the original source SVG (4096×2821). That SVG is not displayed it was used only to extract the bounding boxes and path shapes of each region. The displayed JPEG is 512×353 px, so every `x`, `y`, `width`, and `height` value and the path coordinates for `holy-hill` are original SVG values divided by 8. -->

## The Complete Code

This code is designed to work **without a bundler**. Run `npm install data-navigator`, copy the files into a `src/` directory, and open `index.html` in your browser. The HTML uses an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) to resolve bare module specifiers.

If you're using a bundler (Vite, Webpack, etc.), you can simplify the import to `import dataNavigator from 'data-navigator'` and remove the import map from the HTML.

`coordinator.js` wires both navigation modes together. `structure.js` exports both `structure` (source-based hierarchy) and `storyStructure` (sequential time navigation) along with a `callbacks` object used to wire exit handlers after rendering initialization.

::: code-group

```js [coordinator.js]
import dataNavigator from 'data-navigator';
import { structure, storyStructure, callbacks } from './structure.js';

const captionEl = document.getElementById('caption');

// ── Time mode ────────────────────────────────────────────────────────────────
let timeCurrent = null,
    timePrevious = null;
let timeInput;

const enterTime = () => {
    if (sourceCurrent) {
        sourceRendering.remove(sourceCurrent);
        sourceCurrent = null;
        sourcePrevious = null;
    }
    if (sourceRendering.exitElement) sourceRendering.exitElement.style.display = 'none';
    const nextNode = timeInput.enter();
    if (nextNode) timeLifecycle(nextNode);
};

const timeRendering = dataNavigator.rendering({
    elementData: storyStructure.nodes,
    defaults: { cssClass: 'dn-story-node' },
    suffixId: 'time',
    root: {
        id: 'chart-wrapper',
        description:
            'Correlation of Mapped Formations showing the time period of deposition for each mapped formation of glacial sediment through time in Wisconsin.',
        width: '100%',
        height: 0
    },
    entryButton: { include: true, callbacks: { click: enterTime } },
    exitElement: { include: true }
});
timeRendering.initialize();
timeRendering.entryButton.innerText = 'Navigate sediment by time';

callbacks.onTimeExit = () => {
    timeRendering.exitElement.style.display = 'block';
    timeInput.focus(timeRendering.exitElement.id);
    if (timeCurrent) {
        timeRendering.remove(timeCurrent);
        timeCurrent = null;
    }
    if (captionEl) captionEl.textContent = '';
};

timeInput = dataNavigator.input({
    structure: storyStructure,
    navigationRules: storyStructure.navigationRules,
    entryPoint: 'st-01',
    exitPoint: timeRendering.exitElement?.id
});

const timeMove = direction => {
    const nextNode = timeInput.move(timeCurrent, direction);
    if (nextNode) timeLifecycle(nextNode);
};

const timeLifecycle = nextNode => {
    if (timePrevious) timeRendering.remove(timePrevious);
    const element = timeRendering.render({ renderId: nextNode.renderId, datum: nextNode });
    element.addEventListener('keydown', e => {
        const direction = timeInput.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            timeMove(direction);
        }
    });
    element.addEventListener('focus', () => {
        if (captionEl) captionEl.textContent = nextNode.semantics.label;
    });
    timeInput.focus(nextNode.renderId);
    timePrevious = timeCurrent;
    timeCurrent = nextNode.id;
};

// ── Source mode ──────────────────────────────────────────────────────────────
let sourceCurrent = null,
    sourcePrevious = null;
let sourceInput;

const enterSource = () => {
    if (timeCurrent) {
        timeRendering.remove(timeCurrent);
        timeCurrent = null;
        timePrevious = null;
    }
    if (timeRendering.exitElement) timeRendering.exitElement.style.display = 'none';
    const nextNode = sourceInput.enter();
    if (nextNode) sourceLifecycle(nextNode);
};

const sourceRendering = dataNavigator.rendering({
    elementData: structure.nodes,
    defaults: { cssClass: 'dn-bespoke-node' },
    suffixId: 'source',
    root: {
        id: 'chart-wrapper',
        description:
            'Stratigraphic chart of glacial sediment deposits in Wisconsin. Three columns by sediment source direction.',
        width: '100%',
        height: 0
    },
    entryButton: { include: true, callbacks: { click: enterSource } },
    exitElement: { include: true }
});
sourceRendering.initialize();
sourceRendering.entryButton.innerText = 'Explore sediment by source';

callbacks.onSourceExit = () => {
    sourceRendering.exitElement.style.display = 'block';
    sourceInput.focus(sourceRendering.exitElement.id);
    if (sourceCurrent) {
        sourceRendering.remove(sourceCurrent);
        sourceCurrent = null;
    }
    if (captionEl) captionEl.textContent = '';
};

sourceInput = dataNavigator.input({
    structure,
    navigationRules: structure.navigationRules,
    entryPoint: 'glacial-sediment-w-nw',
    exitPoint: sourceRendering.exitElement?.id
});

const sourceMove = direction => {
    const nextNode = sourceInput.move(sourceCurrent, direction);
    if (nextNode) sourceLifecycle(nextNode);
};

const sourceLifecycle = nextNode => {
    if (sourcePrevious) sourceRendering.remove(sourcePrevious);
    const element = sourceRendering.render({ renderId: nextNode.renderId, datum: nextNode });
    element.addEventListener('keydown', e => {
        const direction = sourceInput.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            sourceMove(direction);
        }
    });
    element.addEventListener('focus', () => {
        if (captionEl) captionEl.textContent = nextNode.semantics.label;
    });
    sourceInput.focus(nextNode.renderId);
    sourcePrevious = sourceCurrent;
    sourceCurrent = nextNode.id;
};
```

```js [structure.js]
// All spatial coordinates use scale 1/8 of the original 4096×2821 SVG space.
// Displayed image is 512×353 px, so original coords ÷ 8 = CSS pixel position.

export const callbacks = { onSourceExit: null, onTimeExit: null };

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
            semantics: {
                label: 'Trade River. Sediment from W/NW, deposited towards the end of the Wisconsin glaciation during the Pleistocene Epoch.'
            },
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
            semantics: {
                label: 'Pierce. Sediment from W/NW, deposited by the Pre-Illinoian glaciation during the Pleistocene Epoch.'
            },
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
            semantics: {
                label: 'Marathon. Sediment from W/NW, deposited by the Pre-Illinoian glaciation during the Pleistocene Epoch.'
            },
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
            semantics: {
                label: 'Miller Creek. Top-most sediment from N/NE, deposited at the end of the Wisconsin glaciation during the Pleistocene Epoch and also deposited during the early Holocene Epoch.'
            },
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
            semantics: {
                label: 'Copper Falls. Sediment from N/NE, deposited from the middle of the Illinoian glaciation until the end of the Wisconsin glaciation during the Pleistocene Epoch.'
            },
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
            semantics: {
                label: 'River Falls. Sediment from N/NE, deposited later by the Illinoian glaciation during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 166, y: 220, width: 53, height: 32 }
        },
        kewaunee: {
            id: 'kewaunee',
            renderId: 'kewaunee',
            edges: ['gsnee-kewaunee', 'kewaunee-oak-creek', 'copper-falls-kewaunee-lr', 'kewaunee-zenda-r', 'any-exit'],
            data: {},
            semantics: {
                label: 'Kewaunee. Sediment from NE/E, deposited at the end of the Wisconsin glaciation during the Pleistocene Epoch.'
            },
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
            semantics: {
                label: 'Oak Creek. Sediment from NE/E, deposited in the middle of the Wisconsin glaciation during the Pleistocene Epoch.'
            },
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
            semantics: {
                label: 'Holy Hill. Sediment from NE/E, deposited from early until after the middle of the Wisconsin glaciation, during the Pleistocene Epoch. Oak Creek was deposited alongside during the later half.'
            },
            spatialProperties: {
                x: 305,
                y: 113,
                width: 95,
                height: 85,
                path: 'M347.75,109.5V144.5H403.125V200.5H301.875V109.5H347.75Z'
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
            semantics: {
                label: 'Zenda. Sediment from NE/E, deposited in during late Illinoian and early Wisconsin glaciations during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 404, y: 189, width: 53, height: 50 }
        },
        walworth: {
            id: 'walworth',
            renderId: 'walworth',
            edges: ['gsnee-walworth-out', 'zenda-walworth', 'holy-hill-walworth-l', 'walworth-pierce-lr', 'any-exit'],
            data: {},
            semantics: {
                label: 'Walworth. Sediment from NE/E, deposited in the middle of the Illinoian glaciation during the Pleistocene Epoch.'
            },
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
        'trade-river-miller-creek': {
            source: 'trade-river',
            target: 'miller-creek',
            navigationRules: ['left', 'right']
        },
        'pierce-marathon-lr': { source: 'pierce', target: 'marathon', navigationRules: ['left', 'right'] },
        'marathon-river-falls-lr': { source: 'marathon', target: 'river-falls', navigationRules: ['left', 'right'] },
        'miller-creek-copper-falls-r': { source: 'miller-creek', target: 'copper-falls', navigationRules: ['right'] },
        'river-falls-copper-falls-lr': {
            source: 'river-falls',
            target: 'copper-falls',
            navigationRules: ['left', 'right']
        },
        'copper-falls-kewaunee-lr': { source: 'copper-falls', target: 'kewaunee', navigationRules: ['left', 'right'] },
        'copper-falls-holy-hill-l': { source: 'copper-falls', target: 'holy-hill', navigationRules: ['left'] },
        'kewaunee-zenda-r': { source: 'kewaunee', target: 'zenda', navigationRules: ['right'] },
        'holy-hill-oak-creek-lr': { source: 'holy-hill', target: 'oak-creek', navigationRules: ['left', 'right'] },
        'oak-creek-zenda-r': { source: 'oak-creek', target: 'zenda', navigationRules: ['right'] },
        'holy-hill-zenda-l': { source: 'holy-hill', target: 'zenda', navigationRules: ['left'] },
        'zenda-pierce-r': { source: 'zenda', target: 'pierce', navigationRules: ['right'] },
        'holy-hill-walworth-l': { source: 'holy-hill', target: 'walworth', navigationRules: ['left'] },
        'walworth-pierce-lr': { source: 'walworth', target: 'pierce', navigationRules: ['left', 'right'] },
        'any-exit': {
            source: (d, c) => c,
            target: () => {
                if (callbacks.onSourceExit) callbacks.onSourceExit();
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

export const storyStructure = {
    nodes: {
        'st-01': {
            id: 'st-01',
            renderId: 'st-01',
            edges: ['st-01-02', 'st-exit'],
            data: {},
            semantics: {
                label: 'Layer 1 of 13. The youngest, topmost glacial deposit from the end of the Pleistocene into the Holocene Epoch. Only Miller Creek is present, deposited from the N/NE.'
            },
            spatialProperties: { x: 6, y: 56, width: 459, height: 15 }
        },
        'st-02': {
            id: 'st-02',
            renderId: 'st-02',
            edges: ['st-01-02', 'st-02-03', 'st-exit'],
            data: {},
            semantics: {
                label: 'Miller Creek and Copper Falls are deposited from the N/NE and Kewaunee is deposited from the NE/E. Close to the very end of the Wisconsin glaciation during the Pleistocene Epoch. Layer 2 of 13.'
            },
            spatialProperties: { x: 6, y: 82, width: 459, height: 1 }
        },
        'st-03': {
            id: 'st-03',
            renderId: 'st-03',
            edges: ['st-02-03', 'st-03-04', 'st-exit'],
            data: {},
            semantics: {
                label: 'Copper Falls is deposited from the N/NE and Kewaunee is deposited from the NE/E. Close to the end of the Wisconsin glaciation during the Pleistocene Epoch. Layer 3 of 13.'
            },
            spatialProperties: { x: 6, y: 89, width: 459, height: 1 }
        },
        'st-04': {
            id: 'st-04',
            renderId: 'st-04',
            edges: ['st-03-04', 'st-04-05', 'st-exit'],
            data: {},
            semantics: {
                label: 'Trade River is deposited from the W/NW, Copper Falls is deposited from the N/NE, and Kewaunee is deposited from the NE/E. In the final quarter of the Wisconsin glaciation during the Pleistocene Epoch. Layer 4 of 13.'
            },
            spatialProperties: { x: 6, y: 97, width: 459, height: 8 }
        },
        'st-05': {
            id: 'st-05',
            renderId: 'st-05',
            edges: ['st-04-05', 'st-05-06', 'st-exit'],
            data: {},
            semantics: {
                label: 'Trade River is deposited from the W/NW, Copper Falls is deposited from the N/NE, and Holy Hill and Oak Creek is deposited from the NE/E. In the later middle of the Wisconsin glaciation during the Pleistocene Epoch. Layer 5 of 13.'
            },
            spatialProperties: { x: 6, y: 116, width: 459, height: 24 }
        },
        'st-06': {
            id: 'st-06',
            renderId: 'st-06',
            edges: ['st-05-06', 'st-06-07', 'st-exit'],
            data: {},
            semantics: {
                label: 'Copper Falls is deposited from the N/NE and Holy Hill is deposited from the NE/E. In the earlier middle of the Wisconsin glaciation during the Pleistocene Epoch. Layer 6 of 13.'
            },
            spatialProperties: { x: 6, y: 152, width: 459, height: 31 }
        },
        'st-07': {
            id: 'st-07',
            renderId: 'st-07',
            edges: ['st-06-07', 'st-07-08', 'st-exit'],
            data: {},
            semantics: {
                label: 'Copper Falls is deposited from the N/NE and Holy Hill and Zenda is deposited from the NE/E. Close to the start of the Wisconsin glaciation during the Pleistocene Epoch. Layer 7 of 13.'
            },
            spatialProperties: { x: 6, y: 194, width: 459, height: 1 }
        },
        'st-08': {
            id: 'st-08',
            renderId: 'st-08',
            edges: ['st-07-08', 'st-08-09', 'st-exit'],
            data: {},
            semantics: {
                label: 'Copper Falls is deposited from the N/NE and Zenda is deposited from the NE/E. At the start of the Wisconsin glaciation during the Pleistocene Epoch. Layer 8 of 13.'
            },
            spatialProperties: { x: 6, y: 202, width: 459, height: 12 }
        },
        'st-09': {
            id: 'st-09',
            renderId: 'st-09',
            edges: ['st-08-09', 'st-09-10', 'st-exit'],
            data: {},
            semantics: {
                label: 'River Falls and Copper Falls is deposited from the N/NE and Zenda is deposited from the NE/E. At the end of the Illinoian glaciation during the Pleistocene Epoch. Layer 9 of 13.'
            },
            spatialProperties: { x: 6, y: 225, width: 459, height: 9 }
        },
        'st-10': {
            id: 'st-10',
            renderId: 'st-10',
            edges: ['st-09-10', 'st-10-11', 'st-exit'],
            data: {},
            semantics: {
                label: 'River Falls and Copper Falls is deposited from the N/NE and Walworth is deposited from the NE/E. In the middle of the Illinoian glaciation during the Pleistocene Epoch. Layer 10 of 13.'
            },
            spatialProperties: { x: 6, y: 246, width: 459, height: 1 }
        },
        'st-11': {
            id: 'st-11',
            renderId: 'st-11',
            edges: ['st-10-11', 'st-11-12', 'st-exit'],
            data: {},
            semantics: {
                label: 'Walworth is deposited from the NE/E. Near the beginning of the Illinoian glaciation during the Pleistocene Epoch. Layer 11 of 13.'
            },
            spatialProperties: { x: 6, y: 257, width: 459, height: 11 }
        },
        'st-12': {
            id: 'st-12',
            renderId: 'st-12',
            edges: ['st-11-12', 'st-12-13', 'st-exit'],
            data: {},
            semantics: { label: 'No deposits. At the start of the Illinoian glaciation. Layer 12 of 13.' },
            spatialProperties: { x: 6, y: 279, width: 459, height: 5 }
        },
        'st-13': {
            id: 'st-13',
            renderId: 'st-13',
            edges: ['st-12-13', 'st-exit'],
            data: {},
            semantics: {
                label: 'Pierce and Marathon are deposited from the NE/E. At the end of the Pre-Illinoian glaciation during the Pleistocene Epoch. Layer 13 of 13, the bottommost layer.'
            },
            spatialProperties: { x: 6, y: 295, width: 459, height: 22 }
        }
    },
    edges: {
        'st-01-02': { source: 'st-01', target: 'st-02', navigationRules: ['up', 'down'] },
        'st-02-03': { source: 'st-02', target: 'st-03', navigationRules: ['up', 'down'] },
        'st-03-04': { source: 'st-03', target: 'st-04', navigationRules: ['up', 'down'] },
        'st-04-05': { source: 'st-04', target: 'st-05', navigationRules: ['up', 'down'] },
        'st-05-06': { source: 'st-05', target: 'st-06', navigationRules: ['up', 'down'] },
        'st-06-07': { source: 'st-06', target: 'st-07', navigationRules: ['up', 'down'] },
        'st-07-08': { source: 'st-07', target: 'st-08', navigationRules: ['up', 'down'] },
        'st-08-09': { source: 'st-08', target: 'st-09', navigationRules: ['up', 'down'] },
        'st-09-10': { source: 'st-09', target: 'st-10', navigationRules: ['up', 'down'] },
        'st-10-11': { source: 'st-10', target: 'st-11', navigationRules: ['up', 'down'] },
        'st-11-12': { source: 'st-11', target: 'st-12', navigationRules: ['up', 'down'] },
        'st-12-13': { source: 'st-12', target: 'st-13', navigationRules: ['up', 'down'] },
        'st-exit': {
            source: (d, c) => c,
            target: () => {
                if (callbacks.onTimeExit) callbacks.onTimeExit();
                return '';
            },
            navigationRules: ['exit']
        }
    },
    navigationRules: {
        up: { key: 'ArrowUp', direction: 'source' },
        down: { key: 'ArrowDown', direction: 'target' },
        exit: { key: 'Escape', direction: 'target' }
    }
};
```

```html [index.html]
<html>
    <head>
        <link rel="stylesheet" href="./src/style.css" />
        <script type="importmap">
            {
                "imports": {
                    "data-navigator": "https://cdn.jsdelivr.net/npm/data-navigator@2.4.1/dist/index.js"
                }
            }
        </script>
    </head>
    <body>
        <div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
            <div>
                <h3>Correlation of Mapped Formations</h3>
                <div id="chart-wrapper" style="position: relative; display: inline-block;">
                    <img src="bespoke.jpg" aria-hidden="true" alt="" width="512" height="353" style="display: block;" />
                </div>
                <div
                    id="caption"
                    role="status"
                    aria-live="polite"
                    style="margin-top: 0.75rem; min-height: 3em; max-width: 512px; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px;"
                >
                    Choose a navigation mode above to begin.
                </div>
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

.dn-story-node {
    pointer-events: none;
    background: transparent;
    border: none;
    position: absolute;
    margin: 0;
}

.dn-story-node:focus {
    outline: 3px solid #1e3369;
    outline-offset: 2px;
}
```

:::

You can also find this example as a ready-to-run project on [GitHub](https://github.com/cmudig/data-navigator/tree/main/assets/bespoke).
