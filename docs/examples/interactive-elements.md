# Interactive Elements

Interactive data visualizations are one of the **strongest use cases** for Data Navigator. Most accessibility work for charts focuses on read-only access — a data table, an alt text, or a structured description. Those approaches work well when users only need to **understand** the chart. They break down when users need to **interact** with it.

Consider a dashboard where clicking data points applies a filter. A mouse user clicks a scatter point and the rest of the dashboard updates. A keyboard-only user, or a screen reader user on mobile, has no way to reach that scatter point through normal keyboard navigation — Bokeh renders it as an SVG element with no focusable role, no keyboard handler, and no accessible label.

Data Navigator provides the missing layer:

- **Text-chat mode** (type `"select"` or `"click"`) — works for screen readers, mobile users, and anyone who prefers typing over arrow keys.
- **Keyboard mode** (<kbd>Space</kbd> to select) — works for keyboard-only users who navigate with arrow keys.
- **Mouse click** — standard pointer interaction for mouse users.

All three paths converge on the same `onClick` callback, so your interaction logic is written once.

## Try It

<div id="ie-plot" style="display:inline-block;"><div id="ie-chart-inner"></div></div>

<label class="dn-nav-toggle">
  <input type="checkbox" id="ie-keyboard">
  Use keyboard navigation
</label>

<div id="ie-chat" style="max-width:500px;margin-top:0.5em;"></div>

<h3 id="ie-table-title" aria-live="polite">0 Selected Data Points</h3>
<div id="ie-table-container"></div>

<div v-show="keyboardMode" class="dn-keyboard-controls">

| Key                          | Action                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Enter navigation area button | Start keyboard navigation                                                             |
| <kbd>←</kbd> <kbd>→</kbd>    | Navigate between sepal-length bins (or data points at leaf level)                     |
| <kbd>↑</kbd> <kbd>↓</kbd>    | Navigate between petal-length bins (or data points at leaf level)                     |
| <kbd>[</kbd> <kbd>]</kbd>    | Navigate between species groups (or data points at leaf level)                        |
| <kbd>Enter</kbd>             | Drill in                                                                              |
| <kbd>Space</kbd>             | **Select / deselect current element** (also selects all children if at a group level) |
| <kbd>W</kbd>                 | Go up to sepal-length level                                                           |
| <kbd>J</kbd>                 | Go up to petal-length level                                                           |
| <kbd>\\</kbd>                | Go up to species level                                                                |
| <kbd>Backspace</kbd>         | Go back to chart root                                                                 |
| <kbd>Escape</kbd>            | Exit navigation                                                                       |

</div>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const keyboardMode = ref(false);

let wrapper = null;

onMounted(async () => {
  const waitFor = (check, timeout = 5000) => new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => check() ? resolve() : Date.now() - start > timeout ? reject(new Error('Timeout')) : setTimeout(poll, 50);
    poll();
  });

  await waitFor(() => typeof Bokeh !== 'undefined' && Bokeh.Plotting);
  await waitFor(() => document.getElementById('ie-plot'));

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
    { pt: 'g5', sepal_length: 6.5, petal_length: 5.8, species: 'virginica' },
  ];

  const colors = { setosa: '#e41a1c', versicolor: '#377eb8', virginica: '#4daf4a' };
  const globalXMin = Math.min(...data.map(d => d.sepal_length));
  const globalXMax = Math.max(...data.map(d => d.sepal_length));
  const globalYMin = Math.min(...data.map(d => d.petal_length));
  const globalYMax = Math.max(...data.map(d => d.petal_length));

  // ─── Selection state ─────────────────────────────────────────────────────────
  const selectedIds = new Set();

  const getLeafIds = (node) => {
    if (!node.derivedNode) return [node.id];
    if (node.data?.dimensionKey) {
      const ids = [];
      for (const div of Object.values(node.data.divisions || {}))
        for (const leafId of Object.keys(div.values || {})) ids.push(leafId);
      return ids;
    }
    return Object.keys(node.data?.values || {});
  };

  const toggleNode = (node) => {
    const leafIds = getLeafIds(node);
    const allSelected = leafIds.length > 0 && leafIds.every(id => selectedIds.has(id));
    if (allSelected) leafIds.forEach(id => selectedIds.delete(id));
    else             leafIds.forEach(id => selectedIds.add(id));
    renderTable();
    drawChart();
  };

  const syncAriaSelected = (node) => {
    const el = document.getElementById(node.id);
    if (!el) return;
    const leafIds = getLeafIds(node);
    const allSelected = leafIds.length > 0 && leafIds.every(id => selectedIds.has(id));
    el.setAttribute('aria-selected', String(allSelected));
  };

  // ─── Table ───────────────────────────────────────────────────────────────────
  const renderTable = () => {
    const titleEl = document.getElementById('ie-table-title');
    const containerEl = document.getElementById('ie-table-container');
    if (!titleEl || !containerEl) return;
    const count = selectedIds.size;
    titleEl.textContent = `${count} Selected Data Point${count !== 1 ? 's' : ''}`;
    if (count === 0) { containerEl.innerHTML = ''; return; }
    const selected = data.filter(d => selectedIds.has(d.pt));
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '0.5em';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    ['ID', 'Sepal Length', 'Petal Length', 'Species'].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      th.style.cssText = 'border:1px solid #ccc;padding:4px 8px;text-align:left;background:#f5f5f5;';
      headerRow.appendChild(th);
    });
    const tbody = table.createTBody();
    selected.forEach(d => {
      const row = tbody.insertRow();
      [d.pt, d.sepal_length, d.petal_length, d.species].forEach(val => {
        const td = row.insertCell();
        td.textContent = val;
        td.style.cssText = 'border:1px solid #ccc;padding:4px 8px;';
      });
    });
    containerEl.innerHTML = '';
    containerEl.appendChild(table);
  };

  // ─── Chart ───────────────────────────────────────────────────────────────────
  let rects = [];
  let focusedGroup = null;
  let focusedPoint = null;
  let divisionRectsByDimension = {};
  let currentPlotView = null;

  const drawChart = () => {
    const container = document.getElementById('ie-chart-inner');
    container.innerHTML = '';
    const plt = Bokeh.Plotting;
    const p = plt.figure({
      height: 320, width: 480,
      title: 'Iris: sepal length vs petal length (click to select)',
      x_axis_label: 'Sepal length (cm)',
      y_axis_label: 'Petal length (cm)',
      toolbar_location: null,
      output_backend: 'svg',
    });
    for (const rect of rects) {
      p.quad({ left:[rect.x1], right:[rect.x2], bottom:[rect.y1], top:[rect.y2],
               fill_alpha:0, line_color:'#333', line_width:rect.lineWidth });
    }
    const source = new Bokeh.ColumnDataSource({
      data: {
        x: data.map(d => d.sepal_length),
        y: data.map(d => d.petal_length),
        pt: data.map(d => d.pt),
        species: data.map(d => d.species),
        fill_color: data.map(d => colors[d.species]),
        fill_alpha: data.map(d =>
          selectedIds.has(d.pt) ? 1.0 : (selectedIds.size > 0 ? 0.3 : 0.7)
        ),
      }
    });
    const renderer = p.scatter({
      x: { field: 'x' }, y: { field: 'y' }, source, size: 8,
      fill_color: { field: 'fill_color' }, line_color: { field: 'fill_color' },
      line_width: 1, fill_alpha: { field: 'fill_alpha' },
    });
    const hover = new Bokeh.HoverTool({
      renderers: [renderer],
      tooltips: [['ID', '@pt'], ['Species', '@species'], ['Sepal length', '@x{0.0}'], ['Petal length', '@y{0.0}']],
    });
    p.add_tools(hover);
    data.filter(d => selectedIds.has(d.pt)).forEach(d => {
      p.scatter({ marker:'circle', x:[d.sepal_length], y:[d.petal_length], size:12,
                  fill_alpha:0, line_color:'#000', line_width:2 });
    });
    if (focusedGroup !== null) {
      data.forEach(d => {
        if (focusedGroup !== '__all__' && d.species !== focusedGroup) return;
        p.scatter({ marker:'circle', x:[d.sepal_length], y:[d.petal_length], size:11,
                    fill_alpha:0, line_color:colors[d.species], line_width:2 });
      });
    }
    if (focusedPoint) {
      p.scatter({ marker:'circle', x:[focusedPoint.x], y:[focusedPoint.y], size:14,
                  fill_alpha:0, line_color:'#333', line_width:2.5 });
    }
    // CustomJS bridges BokehJS's click into our JS closure via a stable global.
    // window.__bokehIeTap is overwritten each drawChart() so it always captures
    // the current selectedIds / renderTable / drawChart references.
    window.__bokehIeTap = (idx) => {
      const d = data[idx];
      if (!d) return;
      if (selectedIds.has(d.pt)) {
        selectedIds.delete(d.pt);
        focusedPoint = null; // clear indicator on deselect
      } else {
        selectedIds.add(d.pt);
        focusedPoint = { x: d.sepal_length, y: d.petal_length }; // individual point indicator only
      }
      renderTable();
      setTimeout(drawChart, 0); // defer out of BokehJS callback stack
    };

    const tap = new Bokeh.TapTool({
      renderers: [renderer],
      callback: new Bokeh.CustomJS({
        args: { source },
        code: `
          const idx = source.selected.indices[0];
          if (idx !== undefined) window.__bokehIeTap(idx);
        `
      })
    });
    p.add_tools(tap);
    p.toolbar.active_tap = tap;
    plt.show(p, '#ie-chart-inner').then(v => {
      if (currentPlotView) {
        try { currentPlotView.remove(); } catch (_) {}
        currentPlotView = null;
      }
      currentPlotView = v;
    });
  };

  drawChart();

  const { addDataNavigator } = await import('@data-navigator/bokeh-wrapper');

  const buildDivisionRects = () => {
    divisionRectsByDimension = {};
    if (!wrapper) return;
    for (const node of Object.values(wrapper.structure.nodes)) {
      if (node.dimensionLevel === 2 && node.data?.numericalExtents) {
        const dimKey = node.derivedNode;
        const [lo, hi] = node.data.numericalExtents;
        if (!divisionRectsByDimension[dimKey]) divisionRectsByDimension[dimKey] = [];
        if (dimKey === 'sepal_length')
          divisionRectsByDimension[dimKey].push({ x1:lo, x2:hi, y1:globalYMin, y2:globalYMax, lineWidth:1 });
        else
          divisionRectsByDimension[dimKey].push({ x1:globalXMin, x2:globalXMax, y1:lo, y2:hi, lineWidth:1 });
      }
    }
  };

  const initWrapper = (mode) => {
    wrapper?.destroy();
    rects = []; focusedGroup = null; focusedPoint = null; divisionRectsByDimension = {};
    drawChart();
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
      renderingOptions: mode !== 'text' ? {
        defaults: { parentSemantics: { elementType: 'figure', role: 'option' } }
      } : undefined,
      onNavigate(node) {
        const level = node.dimensionLevel;
        if (level === 0) {
          rects = Object.values(divisionRectsByDimension).flat(); focusedGroup = null; focusedPoint = null;
        } else if (level === 1) {
          const dimKey = node.data?.dimensionKey ?? node.derivedNode;
          if (dimKey === 'species') { rects = []; focusedGroup = '__all__'; }
          else { rects = divisionRectsByDimension[dimKey] ?? []; focusedGroup = null; }
          focusedPoint = null;
        } else if (node.derivedNode === 'sepal_length') {
          const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
          rects = [{ x1:lo, x2:hi, y1:globalYMin, y2:globalYMax, lineWidth:2 }]; focusedGroup = null; focusedPoint = null;
        } else if (node.derivedNode === 'petal_length') {
          const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
          rects = [{ x1:globalXMin, x2:globalXMax, y1:lo, y2:hi, lineWidth:2 }]; focusedGroup = null; focusedPoint = null;
        } else if (node.derivedNode === 'species') {
          rects = []; focusedGroup = node.data?.species ?? null; focusedPoint = null;
        } else {
          rects = []; focusedGroup = node.data?.species ?? null;
          focusedPoint = { x: +node.data.sepal_length, y: +node.data.petal_length };
        }
        drawChart();
        syncAriaSelected(node);
      },
      onExit() { rects = []; focusedGroup = null; focusedPoint = null; drawChart(); },
      onClick(node) {
        toggleNode(node);
        syncAriaSelected(node);
      },
    });
    buildDivisionRects();
  };

  initWrapper('text');

  document.getElementById('ie-keyboard')?.addEventListener('change', e => {
    keyboardMode.value = e.target.checked;
    initWrapper(e.target.checked ? 'keyboard' : 'text');
  });
});

onUnmounted(() => { wrapper?.destroy(); delete window.__bokehIeTap; });
</script>

<style>
@import 'data-navigator/text-chat.css';
</style>

## About This Example

This example uses the `@data-navigator/bokeh-wrapper` package for convenience. The same pattern works with the core `data-navigator` library directly — see the [Bokeh Wrapper docs](https://dig.cmu.edu/data-navigator/bokeh-wrapper/examples/interactive-elements) for the full annotated version.

### The core pattern: one `onClick`, three input paths

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';

const selectedIds = new Set();

// Collect leaf IDs from any node type (leaf, division, or dimension)
const getLeafIds = node => {
    if (!node.derivedNode) return [node.id]; // leaf
    if (node.data?.dimensionKey) {
        // dimension root
        const ids = [];
        for (const div of Object.values(node.data.divisions || {})) ids.push(...Object.keys(div.values || {}));
        return ids;
    }
    return Object.keys(node.data?.values || {}); // division
};

const wrapper = addDataNavigator({
    plotContainer: 'my-plot',
    data,
    type: 'cartesian',
    xField: 'sepal_length',
    yField: 'petal_length',
    groupField: 'species',
    idField: 'pt',
    // Keyboard mode: aria-selected communicates toggle state to assistive tech
    renderingOptions: {
        defaults: { parentSemantics: { elementType: 'figure', role: 'option' } }
    },
    onNavigate(node) {
        updateChartFocus(node);
        // Reflect current selection state on the keyboard-nav overlay element
        const el = document.getElementById(node.id);
        if (el) {
            const leafIds = getLeafIds(node);
            el.setAttribute('aria-selected', String(leafIds.length > 0 && leafIds.every(id => selectedIds.has(id))));
        }
    },
    onClick(node) {
        // Works for leaf, division (group), and dimension (all) nodes
        const leafIds = getLeafIds(node);
        const allSelected = leafIds.every(id => selectedIds.has(id));
        if (allSelected) leafIds.forEach(id => selectedIds.delete(id));
        else leafIds.forEach(id => selectedIds.add(id));

        updateSelectionTable(selectedIds, data);
        redrawChart(selectedIds, data);

        const el = document.getElementById(node.id);
        if (el) el.setAttribute('aria-selected', String(!allSelected));
    }
});
```

### How Space triggers selection in keyboard mode

When `onClick` is provided and `mode` includes keyboard navigation, Data Navigator automatically adds a <kbd>Space</kbd> keydown handler to each navigated element. Pressing <kbd>Space</kbd> calls `onClick(node)` — the same callback that fires when a user types `"select"` in the text chat or clicks the chart with a mouse.

The wrapper also sets `aria-selected="false"` as an initial attribute. Your `onNavigate` and `onClick` callbacks are responsible for updating this value as selection changes (since only your code knows which items are selected).

### Group-level selection

Navigating to a **division** (e.g. the `setosa` species node) or a **dimension root** (e.g. the species dimension) and pressing <kbd>Space</kbd> (or typing `"select"`) passes that node to `onClick`. Using the `getLeafIds` helper above, you can enumerate all the leaf data points belonging to that group and toggle them in bulk. This lets keyboard and screen reader users efficiently select entire groups — not just individual points.

## The Complete Code

This code is designed to work **without a bundler**. Run `npm install data-navigator @data-navigator/bokeh-wrapper`, copy the files into a project directory, and open `index.html` in your browser. The HTML uses an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) to resolve bare module specifiers, and loads Bokeh from its CDN.

`coordinator.js` wires everything together and owns all mutable state. `chart.js` creates and redraws the Bokeh scatter plot. `selection.js` provides pure helpers for toggling and displaying the current selection.

::: code-group

```js [coordinator.js]
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
```

```js [chart.js]
// Bokeh is loaded as a global via CDN script tags in index.html.
/* global Bokeh */

const colors = { setosa: '#e41a1c', versicolor: '#377eb8', virginica: '#4daf4a' };

let currentPlotView = null;

// Draw (or redraw) the Bokeh scatter plot.
//
// chartState: { rects, focusedGroup, focusedPoint }
//   rects        — array of { x1, x2, y1, y2, lineWidth } overlay rectangles
//   focusedGroup — species name to ring-highlight, '__all__' for all, or null
//   focusedPoint — { x, y } to ring-highlight an individual point, or null
//
// onTap(d) is called when the user clicks a data point directly on the chart.
// It must handle selection state changes; chart.js will defer a redraw automatically.
export function drawChart(containerId, data, selectedIds, chartState, bounds, onTap) {
    const { rects, focusedGroup, focusedPoint } = chartState;
    const { xMin, xMax, yMin, yMax } = bounds;

    // Refresh the global tap bridge every redraw so it always closes over
    // the latest onTap reference. CustomJS in BokehJS cannot import ES modules
    // directly, so we go through a stable window global instead.
    window.__bokehIeTap = idx => {
        const d = data[idx];
        if (!d) return;
        onTap(d);
    };

    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const plt = Bokeh.Plotting;
    const p = plt.figure({
        height: 320,
        width: 480,
        title: 'Iris: sepal length vs petal length (click to select)',
        x_axis_label: 'Sepal length (cm)',
        y_axis_label: 'Petal length (cm)',
        toolbar_location: null,
        output_backend: 'svg'
    });

    // Draw dimension/division overlay rectangles.
    for (const rect of rects) {
        p.quad({
            left: [rect.x1],
            right: [rect.x2],
            bottom: [rect.y1],
            top: [rect.y2],
            fill_alpha: 0,
            line_color: '#333',
            line_width: rect.lineWidth
        });
    }

    // Main scatter plot.
    const source = new Bokeh.ColumnDataSource({
        data: {
            x: data.map(d => d.sepal_length),
            y: data.map(d => d.petal_length),
            pt: data.map(d => d.pt),
            species: data.map(d => d.species),
            fill_color: data.map(d => colors[d.species]),
            fill_alpha: data.map(d => (selectedIds.has(d.pt) ? 1.0 : selectedIds.size > 0 ? 0.3 : 0.7))
        }
    });

    const renderer = p.scatter({
        x: { field: 'x' },
        y: { field: 'y' },
        source,
        size: 8,
        fill_color: { field: 'fill_color' },
        line_color: { field: 'fill_color' },
        line_width: 1,
        fill_alpha: { field: 'fill_alpha' }
    });

    const hover = new Bokeh.HoverTool({
        renderers: [renderer],
        tooltips: [
            ['ID', '@pt'],
            ['Species', '@species'],
            ['Sepal length', '@x{0.0}'],
            ['Petal length', '@y{0.0}']
        ]
    });
    p.add_tools(hover);

    // Draw ring indicators for selected points.
    data.filter(d => selectedIds.has(d.pt)).forEach(d => {
        p.scatter({
            marker: 'circle',
            x: [d.sepal_length],
            y: [d.petal_length],
            size: 12,
            fill_alpha: 0,
            line_color: '#000',
            line_width: 2
        });
    });

    // Draw ring indicator for the focused group.
    if (focusedGroup !== null) {
        data.forEach(d => {
            if (focusedGroup !== '__all__' && d.species !== focusedGroup) return;
            p.scatter({
                marker: 'circle',
                x: [d.sepal_length],
                y: [d.petal_length],
                size: 11,
                fill_alpha: 0,
                line_color: colors[d.species],
                line_width: 2
            });
        });
    }

    // Draw ring indicator for the focused individual point.
    if (focusedPoint) {
        p.scatter({
            marker: 'circle',
            x: [focusedPoint.x],
            y: [focusedPoint.y],
            size: 14,
            fill_alpha: 0,
            line_color: '#333',
            line_width: 2.5
        });
    }

    const tap = new Bokeh.TapTool({
        renderers: [renderer],
        callback: new Bokeh.CustomJS({
            args: { source },
            code: `
                const idx = source.selected.indices[0];
                if (idx !== undefined) window.__bokehIeTap(idx);
            `
        })
    });
    p.add_tools(tap);
    p.toolbar.active_tap = tap;

    plt.show(p, '#' + containerId).then(v => {
        if (currentPlotView) {
            try {
                currentPlotView.remove();
            } catch (_) {}
            currentPlotView = null;
        }
        currentPlotView = v;
    });
}
```

```js [selection.js]
// Returns the leaf data point IDs belonging to any node type:
//   leaf node → [node.id]
//   division node (e.g. the "setosa" group) → all leaf IDs in that division
//   dimension root (e.g. the species dimension) → all leaf IDs in all divisions
export function getLeafIds(node) {
    if (!node.derivedNode) return [node.id];
    if (node.data?.dimensionKey) {
        const ids = [];
        for (const div of Object.values(node.data.divisions || {}))
            for (const leafId of Object.keys(div.values || {})) ids.push(leafId);
        return ids;
    }
    return Object.keys(node.data?.values || {});
}

// Toggle selection for a node (leaf, division, or dimension).
// Modifies selectedIds in place.
export function toggleNode(node, selectedIds) {
    const leafIds = getLeafIds(node);
    const allSelected = leafIds.length > 0 && leafIds.every(id => selectedIds.has(id));
    if (allSelected) leafIds.forEach(id => selectedIds.delete(id));
    else leafIds.forEach(id => selectedIds.add(id));
}

// Sync aria-selected on the Data Navigator overlay element for a node.
export function syncAriaSelected(node, selectedIds) {
    const el = document.getElementById(node.id);
    if (!el) return;
    const leafIds = getLeafIds(node);
    const allSelected = leafIds.length > 0 && leafIds.every(id => selectedIds.has(id));
    el.setAttribute('aria-selected', String(allSelected));
}

// Render a summary table of selected data points.
export function renderTable(selectedIds, data) {
    const titleEl = document.getElementById('ie-table-title');
    const containerEl = document.getElementById('ie-table-container');
    if (!titleEl || !containerEl) return;

    const count = selectedIds.size;
    titleEl.textContent = `${count} Selected Data Point${count !== 1 ? 's' : ''}`;
    if (count === 0) {
        containerEl.innerHTML = '';
        return;
    }

    const selected = data.filter(d => selectedIds.has(d.pt));
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '0.5em';

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    ['ID', 'Sepal Length', 'Petal Length', 'Species'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        th.style.cssText = 'border:1px solid #ccc;padding:4px 8px;text-align:left;background:#f5f5f5;';
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    selected.forEach(d => {
        const row = tbody.insertRow();
        [d.pt, d.sepal_length, d.petal_length, d.species].forEach(val => {
            const td = row.insertCell();
            td.textContent = val;
            td.style.cssText = 'border:1px solid #ccc;padding:4px 8px;';
        });
    });

    containerEl.innerHTML = '';
    containerEl.appendChild(table);
}
```

```html [index.html]
<html>
    <head>
        <link rel="stylesheet" href="./src/style.css" />
        <script type="importmap">
            {
                "imports": {
                    "data-navigator": "./node_modules/data-navigator/dist/index.js",
                    "@data-navigator/bokeh-wrapper": "./node_modules/@data-navigator/bokeh-wrapper/dist/index.js"
                }
            }
        </script>
    </head>
    <body>
        <h2>Iris Scatter Plot — Interactive Selection</h2>
        <div id="ie-plot" style="display:inline-block;">
            <div id="ie-chart-inner"></div>
        </div>

        <label style="display:block;margin:0.5em 0;">
            <input type="checkbox" id="ie-keyboard" />
            Use keyboard navigation
        </label>

        <div id="ie-chat" style="max-width:500px;margin-top:0.5em;"></div>

        <h3 id="ie-table-title" aria-live="polite">0 Selected Data Points</h3>
        <div id="ie-table-container"></div>
    </body>
    <script src="https://cdn.bokeh.org/bokeh/release/bokeh-3.7.3.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.bokeh.org/bokeh/release/bokeh-gl-3.7.3.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.bokeh.org/bokeh/release/bokeh-widgets-3.7.3.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.bokeh.org/bokeh/release/bokeh-tables-3.7.3.min.js" crossorigin="anonymous"></script>
    <script type="module" src="./src/coordinator.js"></script>
</html>
```

```css [style.css]
/* Data Navigator — Text Chat default styles */

.dn-text-chat {
    display: flex;
    flex-direction: column;
    font-family: sans-serif;
    font-size: 14px;
    line-height: 1.4;
    max-width: 400px;
}

.dn-text-chat-log {
    max-height: 300px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid #ccc;
    border-bottom: none;
}

.dn-text-chat-message {
    padding: 2px 0;
}
.dn-text-chat-system {
    color: #666;
    font-style: italic;
}
.dn-text-chat-input-echo {
    font-family: monospace;
    color: #333;
}
.dn-text-chat-response {
    color: #111;
}

.dn-text-chat-controls {
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-bottom: none;
    font-size: 12px;
}

.dn-text-chat-controls label {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
}

.dn-text-chat-form {
    display: flex;
    border: 1px solid #ccc;
}

.dn-text-chat-form input[type='text'] {
    flex: 1;
    padding: 6px 8px;
    border: none;
    font-size: 14px;
    outline: none;
}

.dn-text-chat-form input[type='text']:focus {
    box-shadow: inset 0 0 0 2px #1e3369;
}

.dn-text-chat-form button {
    padding: 6px 12px;
    border: none;
    border-left: 1px solid #ccc;
    cursor: pointer;
    font-size: 14px;
}

.dn-text-chat-choices {
    margin: 4px 0 0;
    padding-left: 2em;
    font-size: 13px;
}

.dn-text-chat-llm-thinking {
    color: #666;
    font-style: italic;
}

.dn-text-chat-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* Keyboard navigation overlay elements */

.dn-node {
    pointer-events: none;
    background: transparent;
    border: none;
    position: absolute;
    margin: 0;
}

.dn-node:focus {
    outline: 2px solid #1e3369;
}
```

:::

You can also find this example as a ready-to-run project on [GitHub](https://github.com/cmudig/data-navigator/tree/main/assets/interactive-elements).
