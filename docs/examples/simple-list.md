# Simple List Navigation

This example shows a simple linked-list navigation structure on a Bokeh stacked bar chart. Four data points are connected in a linear sequence — use left and right arrow keys to move between them. The chart redraws its focus indicator programmatically since Bokeh renders to canvas.

## Keyboard Controls

<button class="toggle-controls" :aria-expanded="showControls" @click="showControls = !showControls">{{ showControls ? 'Hide controls' : 'Show controls' }}</button>

<div v-show="showControls">

| Command                    | Key                                         |
| -------------------------- | ------------------------------------------- |
| Enter the structure        | Activate the "Enter navigation area" button |
| Exit                       | <kbd>Esc</kbd>                              |
| Previous data point        | <kbd>←</kbd>                                |
| Next data point            | <kbd>→</kbd>                                |

</div>

## Chart + Inspector

<div style="display: flex; gap: 2em; flex-wrap: wrap; align-items: flex-start;">
    <div>
        <h3>Stacked Bar Chart (Bokeh)</h3>
        <div id="chart-wrapper" style="position: relative;">
            <div id="chart"></div>
        </div>
    </div>
    <div>
        <h3>Structure Inspector</h3>
        <div id="simple-list-inspector" style="min-height: 350px;"></div>
    </div>
</div>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const showControls = ref(true);
let cleanup = null;

onMounted(async () => {
    const waitFor = (check, timeout = 5000) => new Promise((resolve, reject) => {
        const start = Date.now();
        const poll = () => {
            if (check()) resolve();
            else if (Date.now() - start > timeout) reject(new Error('Timeout'));
            else setTimeout(poll, 50);
        };
        poll();
    });

    try {
        await waitFor(() => typeof Bokeh !== 'undefined' && Bokeh.Plotting);
        await waitFor(() => document.getElementById('chart'));

        const { default: dataNavigator } = await import('data-navigator');
        const { Inspector, buildLabel } = await import('data-navigator-inspector');

        const chartWidth = 300;
        const chartHeight = 300;

        // Data for programmatically drawing focus outlines
        const interactiveData = {
            data: [
                [[3, 2.75], [0, 0]],      // apple: [top values], [bottom values]
                [[3.75, 4], [3, 2.75]]     // banana: [top values], [bottom values]
            ],
            indices: {
                fruit: { apple: 0, banana: 1 },
                store: { a: 0, b: 1 }
            }
        };

        // Function to draw Bokeh chart with optional focus indicator
        const drawChart = (focusData) => {
            const container = document.getElementById('chart');
            container.innerHTML = '';

            const stores = ['a', 'b'];
            const plt = Bokeh.Plotting;
            const p = plt.figure({
                x_range: stores, y_range: [0, 5.5],
                height: chartHeight, width: chartWidth,
                title: 'Fruit cost by store', output_backend: 'svg',
                toolbar_location: null, tools: ''
            });

            // Apple bars (bottom)
            p.vbar({ x: stores, top: [3, 2.75], bottom: [0, 0], width: 0.8,
                     color: '#FCB5B6', line_color: '#8F0002' });
            // Banana bars (stacked on top)
            p.vbar({ x: stores, top: [3.75, 4], bottom: [3, 2.75], width: 0.8,
                     color: '#F9E782', line_color: '#766500' });

            // Draw focus indicator outline if provided
            if (focusData) {
                p.vbar({
                    x: stores,
                    top: focusData.top,
                    bottom: focusData.bottom,
                    width: 0.8,
                    line_width: 3,
                    color: ['transparent', 'transparent'],
                    line_color: focusData.line_color
                });
            }

            // Legend
            const r1 = p.square([-10000], [-10000], { color: '#FCB5B6', line_color: '#8F0002' });
            const r2 = p.square([-10000], [-10000], { color: '#F9E782', line_color: '#766500' });
            p.add_layout(new Bokeh.Legend({
                items: [
                    new Bokeh.LegendItem({ label: 'apple', renderers: [r1] }),
                    new Bokeh.LegendItem({ label: 'banana', renderers: [r2] })
                ],
                location: 'top_left', orientation: 'horizontal'
            }));

            plt.show(p, '#chart');

            // Hide Bokeh's inaccessible elements from AT
            const bokehPlot = document.querySelector('#chart');
            if (bokehPlot) bokehPlot.setAttribute('inert', 'true');
        };

        // Initial chart draw (no focus)
        drawChart(null);

        // Define structure
        let exitHandler = null;

        const structure = {
            nodes: {
                _0: {
                    id: '_0', renderId: '_0',
                    data: { fruit: 'apple', store: 'a', cost: 3 },
                    edges: ['_0-_1', 'any-exit'],
                    semantics: { label: 'fruit: apple. store: a. cost: 3. Data point.' },
                    spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
                },
                _1: {
                    id: '_1', renderId: '_1',
                    data: { fruit: 'banana', store: 'a', cost: 0.75 },
                    edges: ['_0-_1', '_1-_2', 'any-exit'],
                    semantics: { label: 'fruit: banana. store: a. cost: 0.75. Data point.' },
                    spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
                },
                _2: {
                    id: '_2', renderId: '_2',
                    data: { fruit: 'apple', store: 'b', cost: 2.75 },
                    edges: ['_1-_2', '_2-_3', 'any-exit'],
                    semantics: { label: 'fruit: apple. store: b. cost: 2.75. Data point.' },
                    spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
                },
                _3: {
                    id: '_3', renderId: '_3',
                    data: { fruit: 'banana', store: 'b', cost: 1.25 },
                    edges: ['_2-_3', 'any-exit'],
                    semantics: { label: 'fruit: banana. store: b. cost: 1.25. Data point.' },
                    spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
                }
            },
            edges: {
                '_0-_1': { source: '_0', target: '_1', navigationRules: ['left', 'right'] },
                '_1-_2': { source: '_1', target: '_2', navigationRules: ['left', 'right'] },
                '_2-_3': { source: '_2', target: '_3', navigationRules: ['left', 'right'] },
                'any-exit': {
                    source: (d, c) => c,
                    target: () => { if (exitHandler) exitHandler(); return ''; },
                    navigationRules: ['exit']
                }
            },
            navigationRules: {
                left: { key: 'ArrowLeft', direction: 'source' },
                right: { key: 'ArrowRight', direction: 'target' },
                exit: { key: 'Escape', direction: 'target' }
            }
        };

        // Create the inspector (passive)
        const inspector = Inspector({
            structure,
            container: 'simple-list-inspector',
            size: 250,
            colorBy: 'dimensionLevel',
            edgeExclusions: ['any-exit'],
            nodeInclusions: ['exit']
        });

        // State & tooltip
        let current = null;
        let previous = null;

        const showTooltip = (node) => {
            const tooltip = document.getElementById('chart-tooltip');
            if (tooltip && node.semantics?.label) {
                tooltip.textContent = node.semantics.label;
                tooltip.classList.remove('hidden');
                tooltip.style.transform = `translate(${chartWidth + 10}px, ${chartHeight / 2 - 20}px)`;
            }
        };

        const hideTooltip = () => {
            const tooltip = document.getElementById('chart-tooltip');
            if (tooltip) tooltip.classList.add('hidden');
        };

        // Draw focus indicator on the Bokeh chart
        const drawFocusIndicator = (node) => {
            if (!node?.data) return;

            const fruitIndex = interactiveData.indices.fruit[node.data.fruit];
            const storeIndex = interactiveData.indices.store[node.data.store];
            const barData = interactiveData.data[fruitIndex];

            const line_color = storeIndex === 0 ? ['#000000', 'transparent'] : ['transparent', '#000000'];

            drawChart({
                top: barData[0],
                bottom: barData[1],
                line_color
            });
        };

        // Set up rendering
        const enter = () => {
            const nextNode = input.enter();
            if (nextNode) initiateLifecycle(nextNode);
        };

        const rendering = dataNavigator.rendering({
            elementData: structure.nodes,
            defaults: { cssClass: 'dn-manual-focus-node' },
            suffixId: 'simple-list',
            root: {
                id: 'chart-wrapper',
                description: 'Fruit cost by store chart. Use arrow keys to navigate.',
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
            hideTooltip();
            inspector.clear();
            drawChart(null);
        };

        // Set up input handler
        const input = dataNavigator.input({
            structure,
            navigationRules: structure.navigationRules,
            entryPoint: '_0',
            exitPoint: rendering.exitElement?.id
        });

        // Navigation lifecycle
        const move = (direction) => {
            const nextNode = input.move(current, direction);
            if (nextNode) initiateLifecycle(nextNode);
        };

        const initiateLifecycle = (nextNode) => {
            if (previous) rendering.remove(previous);

            const element = rendering.render({ renderId: nextNode.renderId, datum: nextNode });

            element.addEventListener('keydown', (e) => {
                const direction = input.keydownValidator(e);
                if (direction) { e.preventDefault(); move(direction); }
            });

            element.addEventListener('focus', () => {
                showTooltip(nextNode);
                drawFocusIndicator(nextNode);
                inspector.highlight(nextNode.renderId);
            });

            element.addEventListener('blur', () => {
                hideTooltip();
                inspector.clear();
            });

            input.focus(nextNode.renderId);
            previous = current;
            current = nextNode.id;
        };

        cleanup = () => { if (rendering) rendering.clearStructure(); };
    } catch (e) {
        console.error('Failed to initialize:', e);
        const container = document.getElementById('chart');
        if (container) {
            container.innerHTML = `<p style="color: var(--vp-c-danger-1);">Error: ${e.message}</p>`;
        }
    }
});

onUnmounted(() => { if (cleanup) cleanup(); });
</script>

### About This Example

This is the same chart and structure from the [Getting Started guide](/getting-started/first-chart), shown here with an [inspector](/examples/using-the-inspector) view. The structure is a simple linked list — four data points connected by left/right edges. The Bokeh chart renders to canvas, so the focus indicator is drawn programmatically by redrawing the chart with a thick outline on the focused bar.

The [inspector's](/examples/using-the-inspector) force graph shows the same linear structure: four nodes in a chain with an exit node. As you navigate, the inspector's focus indicator follows your position.
