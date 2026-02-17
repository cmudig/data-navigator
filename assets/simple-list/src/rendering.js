import dataNavigator from 'data-navigator';
import { chartWidth, chartHeight, interactiveData } from './structure.js';

// Draws the Bokeh chart. Pass focusData to add a thick outline
// around one bar, or null to draw without any indicator.
export function drawChart(focusData) {
    const container = document.getElementById('chart');
    container.innerHTML = '';

    const stores = ['a', 'b'];
    const p = Bokeh.Plotting.figure({
        x_range: stores, y_range: [0, 5.5],
        height: chartHeight, width: chartWidth,
        title: 'Fruit cost by store', output_backend: 'svg',
        toolbar_location: null, tools: ''
    });

    p.vbar({ x: stores, top: [3, 2.75], bottom: [0, 0], width: 0.8,
             color: '#FCB5B6', line_color: '#8F0002' });
    p.vbar({ x: stores, top: [3.75, 4], bottom: [3, 2.75], width: 0.8,
             color: '#F9E782', line_color: '#766500' });

    if (focusData) {
        p.vbar({
            x: stores, top: focusData.top, bottom: focusData.bottom,
            width: 0.8, line_width: 3,
            color: ['transparent', 'transparent'],
            line_color: focusData.line_color
        });
    }

    const r1 = p.square([-10000], [-10000], { color: '#FCB5B6', line_color: '#8F0002' });
    const r2 = p.square([-10000], [-10000], { color: '#F9E782', line_color: '#766500' });
    p.add_layout(new Bokeh.Legend({
        items: [
            new Bokeh.LegendItem({ label: 'apple', renderers: [r1] }),
            new Bokeh.LegendItem({ label: 'banana', renderers: [r2] })
        ],
        location: 'top_left', orientation: 'horizontal'
    }));

    Bokeh.Plotting.show(p, '#chart');
    const bokehPlot = document.querySelector('#chart');
    if (bokehPlot) bokehPlot.setAttribute('inert', 'true');
}

// Redraws the chart with a focus outline on the matching bar.
export function drawFocusIndicator(node) {
    if (!node?.data) return;
    const fruitIndex = interactiveData.indices.fruit[node.data.fruit];
    const storeIndex = interactiveData.indices.store[node.data.store];
    const barData = interactiveData.data[fruitIndex];
    const line_color = storeIndex === 0
        ? ['#000000', 'transparent']
        : ['transparent', '#000000'];
    drawChart({ top: barData[0], bottom: barData[1], line_color });
}

// Creates the accessible HTML layer.
export function createRenderer(structure, onEnter) {
    const renderer = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-manual-focus-node' },
        suffixId: 'simple-list',
        root: {
            id: 'chart-wrapper',
            description: 'Fruit cost by store chart. Use arrow keys to navigate.',
            width: '100%', height: 0
        },
        entryButton: { include: true, callbacks: { click: onEnter } },
        exitElement: { include: true }
    });
    renderer.initialize();
    return renderer;
}
