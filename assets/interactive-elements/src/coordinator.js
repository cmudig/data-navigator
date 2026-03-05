import { addDataNavigator } from '@data-navigator/bokeh-wrapper';
import { drawChart } from './chart.js';
import { toggleNode, syncAriaSelected, renderTable } from './selection.js';

// ─── Data ────────────────────────────────────────────────────────────────────

const data = [
    { pt: 's1', sepal_length: 5.1, petal_length: 1.4, species: 'setosa' },
    { pt: 's2', sepal_length: 4.9, petal_length: 1.4, species: 'setosa' },
    { pt: 's3', sepal_length: 4.7, petal_length: 1.3, species: 'setosa' },
    { pt: 's4', sepal_length: 5.8, petal_length: 1.2, species: 'setosa' },
    { pt: 's5', sepal_length: 5.0, petal_length: 1.0, species: 'setosa' },
    { pt: 'v1', sepal_length: 7.0, petal_length: 4.7, species: 'versicolor' },
    { pt: 'v2', sepal_length: 6.4, petal_length: 4.5, species: 'versicolor' },
    { pt: 'v3', sepal_length: 6.9, petal_length: 4.9, species: 'versicolor' },
    { pt: 'v4', sepal_length: 5.5, petal_length: 4.0, species: 'versicolor' },
    { pt: 'v5', sepal_length: 6.5, petal_length: 4.6, species: 'versicolor' },
    { pt: 'g1', sepal_length: 6.3, petal_length: 6.0, species: 'virginica' },
    { pt: 'g2', sepal_length: 5.8, petal_length: 5.1, species: 'virginica' },
    { pt: 'g3', sepal_length: 7.1, petal_length: 5.9, species: 'virginica' },
    { pt: 'g4', sepal_length: 6.3, petal_length: 5.6, species: 'virginica' },
    { pt: 'g5', sepal_length: 6.5, petal_length: 5.8, species: 'virginica' }
];

const bounds = {
    xMin: Math.min(...data.map(d => d.sepal_length)),
    xMax: Math.max(...data.map(d => d.sepal_length)),
    yMin: Math.min(...data.map(d => d.petal_length)),
    yMax: Math.max(...data.map(d => d.petal_length))
};

// ─── Selection state ─────────────────────────────────────────────────────────

const selectedIds = new Set();

// ─── Chart state ─────────────────────────────────────────────────────────────

// chartState holds the visual overlay driven by Data Navigator's onNavigate callback.
let chartState = { rects: [], focusedGroup: null, focusedPoint: null };

// onTap is called when the user clicks a data point directly on the Bokeh chart.
// We defer the redraw out of BokehJS's callback stack with setTimeout.
function onTap(d) {
    if (selectedIds.has(d.pt)) {
        selectedIds.delete(d.pt);
        chartState.focusedPoint = null;
    } else {
        selectedIds.add(d.pt);
        chartState.focusedPoint = { x: d.sepal_length, y: d.petal_length };
    }
    renderTable(selectedIds, data);
    setTimeout(redraw, 0);
}

function redraw() {
    drawChart('ie-chart-inner', data, selectedIds, chartState, bounds, onTap);
}

// ─── Wrapper ─────────────────────────────────────────────────────────────────

let wrapper = null;
let divisionRectsByDimension = {};

// After the wrapper builds the structure, read division extents so onNavigate
// can highlight the correct region of the chart.
function buildDivisionRects() {
    divisionRectsByDimension = {};
    if (!wrapper) return;
    for (const node of Object.values(wrapper.structure.nodes)) {
        if (node.dimensionLevel === 2 && node.data?.numericalExtents) {
            const dimKey = node.derivedNode;
            const [lo, hi] = node.data.numericalExtents;
            if (!divisionRectsByDimension[dimKey]) divisionRectsByDimension[dimKey] = [];
            if (dimKey === 'sepal_length')
                divisionRectsByDimension[dimKey].push({
                    x1: lo,
                    x2: hi,
                    y1: bounds.yMin,
                    y2: bounds.yMax,
                    lineWidth: 1
                });
            else
                divisionRectsByDimension[dimKey].push({
                    x1: bounds.xMin,
                    x2: bounds.xMax,
                    y1: lo,
                    y2: hi,
                    lineWidth: 1
                });
        }
    }
}

function initWrapper(mode) {
    wrapper?.destroy();
    chartState = { rects: [], focusedGroup: null, focusedPoint: null };
    divisionRectsByDimension = {};
    redraw();

    wrapper = addDataNavigator({
        plotContainer: 'ie-plot',
        chatContainer: 'ie-chat',
        mode,
        data,
        type: 'cartesian',
        xField: 'sepal_length',
        yField: 'petal_length',
        groupField: 'species',
        idField: 'pt',
        title: 'Iris: sepal length vs petal length',
        // Keyboard mode: aria-selected communicates toggle state to assistive tech.
        renderingOptions:
            mode !== 'text'
                ? {
                      defaults: { parentSemantics: { elementType: 'figure', role: 'option' } }
                  }
                : undefined,
        onNavigate(node) {
            const level = node.dimensionLevel;
            if (level === 0) {
                chartState.rects = Object.values(divisionRectsByDimension).flat();
                chartState.focusedGroup = null;
                chartState.focusedPoint = null;
            } else if (level === 1) {
                const dimKey = node.data?.dimensionKey ?? node.derivedNode;
                if (dimKey === 'species') {
                    chartState.rects = [];
                    chartState.focusedGroup = '__all__';
                } else {
                    chartState.rects = divisionRectsByDimension[dimKey] ?? [];
                    chartState.focusedGroup = null;
                }
                chartState.focusedPoint = null;
            } else if (node.derivedNode === 'sepal_length') {
                const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
                chartState.rects = [{ x1: lo, x2: hi, y1: bounds.yMin, y2: bounds.yMax, lineWidth: 2 }];
                chartState.focusedGroup = null;
                chartState.focusedPoint = null;
            } else if (node.derivedNode === 'petal_length') {
                const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
                chartState.rects = [{ x1: bounds.xMin, x2: bounds.xMax, y1: lo, y2: hi, lineWidth: 2 }];
                chartState.focusedGroup = null;
                chartState.focusedPoint = null;
            } else if (node.derivedNode === 'species') {
                chartState.rects = [];
                chartState.focusedGroup = node.data?.species ?? null;
                chartState.focusedPoint = null;
            } else {
                // Leaf node
                chartState.rects = [];
                chartState.focusedGroup = node.data?.species ?? null;
                chartState.focusedPoint = { x: +node.data.sepal_length, y: +node.data.petal_length };
            }
            redraw();
            syncAriaSelected(node, selectedIds);
        },
        onExit() {
            chartState = { rects: [], focusedGroup: null, focusedPoint: null };
            redraw();
        },
        onClick(node) {
            toggleNode(node, selectedIds);
            renderTable(selectedIds, data);
            redraw();
            syncAriaSelected(node, selectedIds);
        }
    });

    buildDivisionRects();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

redraw();
initWrapper('text');

document.getElementById('ie-keyboard')?.addEventListener('change', e => {
    initWrapper(e.target.checked ? 'keyboard' : 'text');
});
