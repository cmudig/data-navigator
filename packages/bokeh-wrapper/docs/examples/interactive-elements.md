# Interactive Elements

Interactive data visualizations are one of the **strongest use cases** for Data Navigator. Most accessibility work for charts focuses on read-only access — a table, an extended description, or a title. But what happens when the chart itself is interactive? When users can click data points to filter a dashboard, select items to compare, or trigger actions tied to specific values?

Keyboard-only users and screen reader users need a way to **navigate to** and **interact with** those elements — not just read about them. Data Navigator bridges that gap: it provides a structured navigation interface over the chart, and the `onClick` callback fires whether the user types `"select"` in the text chat, presses <kbd>Space</kbd> in keyboard mode, or clicks the point directly on the chart.

This example lets you click (or select) individual Iris data points and groups. Selected points are collected into a table below the chart.

## Live example

<div id="ie-plot" style="display:inline-block;"><div id="ie-chart-inner"></div></div>

<label class="dn-nav-toggle">
  <input type="checkbox" id="ie-keyboard">
  Use keyboard navigation
</label>

<div id="ie-chat" style="max-width:500px;"></div>

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
| <kbd>Backspace</kbd>         | Go back to chart root (from dimension roots)                                          |
| <kbd>Escape</kbd>            | Exit navigation                                                                       |

</div>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const keyboardMode = ref(false);

let wrapper = null;
let addDataNavigator = null;

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

  // ─── Selection state ────────────────────────────────────────────────────────
  const selectedIds = new Set();

  const getLeafIds = (node) => {
    if (!node.derivedNode) {
      // Leaf node — just this point
      return [node.id];
    }
    if (node.data?.dimensionKey) {
      // Dimension root — collect all leaves across all divisions
      const ids = [];
      for (const div of Object.values(node.data.divisions || {})) {
        for (const leafId of Object.keys(div.values || {})) ids.push(leafId);
      }
      return ids;
    }
    // Division node (e.g. a species category or a bin) — collect its direct leaves
    return Object.keys(node.data?.values || {});
  };

  const toggleNode = (node) => {
    const leafIds = getLeafIds(node);
    // If ALL leaves are already selected → deselect all; otherwise → select all
    const allSelected = leafIds.length > 0 && leafIds.every(id => selectedIds.has(id));
    if (allSelected) {
      leafIds.forEach(id => selectedIds.delete(id));
    } else {
      leafIds.forEach(id => selectedIds.add(id));
    }
    renderTable();
    drawChart();
  };

  // ─── Table rendering ─────────────────────────────────────────────────────────
  const renderTable = () => {
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
      th.style.cssText = 'border:1px solid #ccc; padding:4px 8px; text-align:left; background:#f5f5f5;';
      headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    selected.forEach(d => {
      const row = tbody.insertRow();
      [d.pt, d.sepal_length, d.petal_length, d.species].forEach(val => {
        const td = row.insertCell();
        td.textContent = val;
        td.style.cssText = 'border:1px solid #ccc; padding:4px 8px;';
      });
    });

    containerEl.innerHTML = '';
    containerEl.appendChild(table);
  };

  // ─── Chart ──────────────────────────────────────────────────────────────────
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
      title: 'Iris: sepal length vs petal length (click points to select)',
      x_axis_label: 'Sepal length (cm)',
      y_axis_label: 'Petal length (cm)',
      toolbar_location: null,
      output_backend: 'svg',
    });

    // Bin indicator rectangles
    for (const rect of rects) {
      p.quad({
        left: [rect.x1], right: [rect.x2],
        bottom: [rect.y1], top: [rect.y2],
        fill_alpha: 0,
        line_color: '#333',
        line_width: rect.lineWidth,
      });
    }

    // Base scatter — ColumnDataSource enables TapTool click events and HoverTool tooltips
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
      x: { field: 'x' },
      y: { field: 'y' },
      source,
      size: 8,
      fill_color: { field: 'fill_color' },
      line_color: { field: 'fill_color' },
      line_width: 1,
      fill_alpha: { field: 'fill_alpha' },
    });

    const hover = new Bokeh.HoverTool({
      renderers: [renderer],
      tooltips: [['ID', '@pt'], ['Species', '@species'], ['Sepal length', '@x{0.0}'], ['Petal length', '@y{0.0}']],
    });
    p.add_tools(hover);

    // Selected point rings
    data.filter(d => selectedIds.has(d.pt)).forEach(d => {
      p.scatter({
        marker: 'circle',
        x: [d.sepal_length],
        y: [d.petal_length],
        size: 12,
        fill_alpha: 0,
        line_color: '#000',
        line_width: 2,
      });
    });

    // Colored rings around focused-group points
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
          line_width: 2,
        });
      });
    }

    // Individual focus indicator
    if (focusedPoint) {
      p.scatter({
        marker: 'circle',
        x: [focusedPoint.x],
        y: [focusedPoint.y],
        size: 14,
        fill_alpha: 0,
        line_color: '#333',
        line_width: 2.5,
      });
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
      // Properly destroy the old BokehJS view before clearing the DOM.
      // view.remove() disconnects all signals and recursively removes child views
      // (including HoverToolView + its tooltip), preventing floating tooltip artifacts.
      if (currentPlotView) {
        try { currentPlotView.remove(); } catch (_) {}
        currentPlotView = null;
      }
      currentPlotView = v;

    });
  };

  // ─── Selection update helper for keyboard nav elements ───────────────────────
  const syncAriaSelected = (node) => {
    const el = document.getElementById(node.id);
    if (!el) return;
    const leafIds = getLeafIds(node);
    const allSelected = leafIds.length > 0 && leafIds.every(id => selectedIds.has(id));
    el.setAttribute('aria-selected', String(allSelected));
  };

  // ─── Wrapper init ────────────────────────────────────────────────────────────
  drawChart();

  ({ addDataNavigator } = await import('@data-navigator/bokeh-wrapper'));

  const buildDivisionRects = () => {
    divisionRectsByDimension = {};
    if (!wrapper) return;
    for (const node of Object.values(wrapper.structure.nodes)) {
      if (node.dimensionLevel === 2 && node.data?.numericalExtents) {
        const dimKey = node.derivedNode;
        const [lo, hi] = node.data.numericalExtents;
        if (!divisionRectsByDimension[dimKey]) divisionRectsByDimension[dimKey] = [];
        if (dimKey === 'sepal_length') {
          divisionRectsByDimension[dimKey].push({ x1: lo, x2: hi, y1: globalYMin, y2: globalYMax, lineWidth: 1 });
        } else {
          divisionRectsByDimension[dimKey].push({ x1: globalXMin, x2: globalXMax, y1: lo, y2: hi, lineWidth: 1 });
        }
      }
    }
  };

  const initWrapper = (mode) => {
    wrapper?.destroy();
    rects = [];
    focusedGroup = null;
    focusedPoint = null;
    divisionRectsByDimension = {};
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
      // Keyboard mode: render selectable elements with appropriate semantics
      renderingOptions: mode !== 'text' ? {
        defaults: {
          parentSemantics: { elementType: 'figure', role: 'option' }
        }
      } : undefined,
      onNavigate(node) {
        const level = node.dimensionLevel;
        if (level === 0) {
          rects = Object.values(divisionRectsByDimension).flat();
          focusedGroup = null;
          focusedPoint = null;
        } else if (level === 1) {
          const dimKey = node.data?.dimensionKey ?? node.derivedNode;
          if (dimKey === 'species') {
            rects = [];
            focusedGroup = '__all__';
          } else {
            rects = divisionRectsByDimension[dimKey] ?? [];
            focusedGroup = null;
          }
          focusedPoint = null;
        } else if (node.derivedNode === 'sepal_length') {
          const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
          rects = [{ x1: lo, x2: hi, y1: globalYMin, y2: globalYMax, lineWidth: 2 }];
          focusedGroup = null;
          focusedPoint = null;
        } else if (node.derivedNode === 'petal_length') {
          const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
          rects = [{ x1: globalXMin, x2: globalXMax, y1: lo, y2: hi, lineWidth: 2 }];
          focusedGroup = null;
          focusedPoint = null;
        } else if (node.derivedNode === 'species') {
          rects = [];
          focusedGroup = node.data?.species ?? null;
          focusedPoint = null;
        } else {
          rects = [];
          focusedGroup = node.data?.species ?? null;
          focusedPoint = {
            x: +node.data.sepal_length,
            y: +node.data.petal_length,
          };
        }
        drawChart();
        // Keep aria-selected in sync after each navigation
        syncAriaSelected(node);
      },
      onExit() {
        rects = [];
        focusedGroup = null;
        focusedPoint = null;
        drawChart();
      },
      onClick(node) {
        toggleNode(node);
        // Update aria-selected on the currently rendered keyboard nav element
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

## Why interactive visualizations need Data Navigator

Most accessible chart implementations stop at _read-only_ access: a data table, an alt text, or a structured description. Those approaches work well when users only need to **understand** the chart. They break down when users need to **interact** with it.

Consider a dashboard where clicking data points applies a filter. A mouse user clicks a scatter point and the rest of the dashboard updates. A keyboard-only user, or a screen reader user on mobile, has no way to reach that scatter point through normal keyboard navigation — Bokeh renders it as an SVG element with no focusable role, no keyboard handler, and no accessible label.

Data Navigator provides the missing layer:

- **Text-chat mode** (`type "select"` or `type "click"`) — works for screen readers, mobile users, and anyone who prefers typing over arrow keys.
- **Keyboard mode** (<kbd>Space</kbd> to select) — works for keyboard-only users who navigate with arrow keys.
- **Mouse click** — standard pointer interaction for mouse users.

All three paths converge on the same `onClick` callback, so your interaction logic is written once.

### Group-level selection

At a **division level** (e.g. a species category like `setosa`) or a **dimension root** (e.g. the `species` dimension), pressing <kbd>Space</kbd> or typing `"select"` will toggle _all child data points_ in that group. The `onClick` callback receives the group node, and your handler can inspect `node.data.values` (division) or `node.data.divisions` (dimension) to enumerate the children.

In the text chat, typing `"select"` at a division node will say "Clicked: setosa. 5 child data points. Division." — then your callback handles the bulk operation.

### `renderingOptions` for keyboard mode

When `mode: 'keyboard'` is active, Data Navigator overlays focusable elements on the chart canvas. Passing `renderingOptions.defaults.parentSemantics` lets you control the ARIA role of those elements. For interactive (selectable) charts, `role: 'option'` signals to assistive technologies that the element can be selected, and `aria-selected` communicates its current state. The wrapper automatically adds `aria-selected="false"` to each element when `onClick` is provided; your `onClick` and `onNavigate` callbacks are responsible for updating it when the selection changes.

### Mouse click wiring

Bokeh uses an internal canvas event overlay that intercepts pointer events before they reach the SVG. Querying `svg circle` elements and attaching `addEventListener('click')` will not work — those events never fire.

The correct approach uses BokehJS's `ColumnDataSource`, `TapTool`, and a `CustomJS` callback that runs inside BokehJS's own execution context (where `source.selected.indices` is reliably populated). Bridge it to your JavaScript via a stable global that is updated on every redraw:

```js
const source = new Bokeh.ColumnDataSource({
    data: {
        x: data.map(d => d.sepal_length),
        y: data.map(d => d.petal_length),
        pt: data.map(d => d.pt),
        species: data.map(d => d.species),
        fill_color: data.map(d => colors[d.species]),
        fill_alpha: data.map(d => (selectedIds.has(d.pt) ? 1.0 : 0.4))
    }
});

const renderer = p.scatter({
    x: { field: 'x' },
    y: { field: 'y' },
    source,
    size: 8,
    fill_color: { field: 'fill_color' },
    fill_alpha: { field: 'fill_alpha' },
    line_color: { field: 'fill_color' }
});

// HoverTool reads directly from the ColumnDataSource columns.
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

// CustomJS bridges BokehJS's event into our JS closure via a stable global.
// Overwrite the global each drawChart() to keep the closure current.
window.__bokehIeTap = idx => {
    const d = data[idx];
    if (!d) return;
    if (selectedIds.has(d.pt)) selectedIds.delete(d.pt);
    else selectedIds.add(d.pt);
    updateSelectionTable(selectedIds, data);
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
p.toolbar.active_tap = tap; // must be set explicitly when toolbar_location is null
plt.show(p, '#my-plot');
```

## Full code

Create three files in the same directory and serve them with a local server (e.g. `npx serve .` or `python -m http.server`). Bokeh is loaded from CDN; the wrapper is loaded via import map. The **wrapper** tab is the integration layer; **chart** is the Bokeh rendering code (including TapTool wiring for mouse clicks).

::: code-group

```js [wrapper.js]
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';
import { data, drawChart, renderTable } from './chart.js';

const selectedIds = new Set();

// Resolve the leaf point IDs for any node (leaf, division, or dimension root).
function getLeafIds(node) {
    if (!node.derivedNode) return [node.id]; // leaf
    if (node.data?.dimensionKey) {
        // Dimension root — collect all leaves across all divisions
        const ids = [];
        for (const div of Object.values(node.data.divisions || {})) {
            for (const leafId of Object.keys(div.values || {})) ids.push(leafId);
        }
        return ids;
    }
    // Division node — collect its direct leaves
    return Object.keys(node.data?.values || {});
}

function toggleNode(node) {
    const leafIds = getLeafIds(node);
    const allSelected = leafIds.length > 0 && leafIds.every(id => selectedIds.has(id));
    if (allSelected) {
        leafIds.forEach(id => selectedIds.delete(id));
    } else {
        leafIds.forEach(id => selectedIds.add(id));
    }
    renderTable(selectedIds, data);
    redraw({ focusedGroup: null, focusedPoint: null });
}

function syncAriaSelected(node) {
    const el = document.getElementById(node.id);
    if (!el) return;
    const leafIds = getLeafIds(node);
    const allSelected = leafIds.length > 0 && leafIds.every(id => selectedIds.has(id));
    el.setAttribute('aria-selected', String(allSelected));
}

let wrapper = null;
let rects = [];
let focusedGroup = null;
let focusedPoint = null;
let divisionRectsByDimension = {};
let currentMode = 'text';

const globalXMin = Math.min(...data.map(d => d.sepal_length));
const globalXMax = Math.max(...data.map(d => d.sepal_length));
const globalYMin = Math.min(...data.map(d => d.petal_length));
const globalYMax = Math.max(...data.map(d => d.petal_length));

function redraw(state = {}) {
    if ('rects' in state) rects = state.rects;
    if ('focusedGroup' in state) focusedGroup = state.focusedGroup;
    if ('focusedPoint' in state) focusedPoint = state.focusedPoint;
    drawChart({ selectedIds, rects, focusedGroup, focusedPoint, onTap: handleTap });
}

function handleTap(idx) {
    const d = data[idx];
    if (!d) return;
    if (selectedIds.has(d.pt)) {
        selectedIds.delete(d.pt);
        focusedPoint = null;
    } else {
        selectedIds.add(d.pt);
        focusedPoint = { x: d.sepal_length, y: d.petal_length };
    }
    renderTable(selectedIds, data);
    setTimeout(() => redraw({}), 0); // defer out of BokehJS callback stack
}

function buildDivisionRects() {
    divisionRectsByDimension = {};
    if (!wrapper) return;
    for (const node of Object.values(wrapper.structure.nodes)) {
        if (node.dimensionLevel === 2 && node.data?.numericalExtents) {
            const dimKey = node.derivedNode;
            const [lo, hi] = node.data.numericalExtents;
            if (!divisionRectsByDimension[dimKey]) divisionRectsByDimension[dimKey] = [];
            if (dimKey === 'sepal_length') {
                divisionRectsByDimension[dimKey].push({ x1: lo, x2: hi, y1: globalYMin, y2: globalYMax, lineWidth: 1 });
            } else {
                divisionRectsByDimension[dimKey].push({ x1: globalXMin, x2: globalXMax, y1: lo, y2: hi, lineWidth: 1 });
            }
        }
    }
}

function initWrapper(mode) {
    currentMode = mode;
    wrapper?.destroy();
    rects = [];
    focusedGroup = null;
    focusedPoint = null;
    divisionRectsByDimension = {};
    redraw({});
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
        renderingOptions:
            mode !== 'text'
                ? {
                      defaults: { parentSemantics: { elementType: 'figure', role: 'option' } }
                  }
                : undefined,
        onNavigate(node) {
            const level = node.dimensionLevel;
            if (level === 0) {
                rects = Object.values(divisionRectsByDimension).flat();
                focusedGroup = null;
                focusedPoint = null;
            } else if (level === 1) {
                const dimKey = node.data?.dimensionKey ?? node.derivedNode;
                if (dimKey === 'species') {
                    rects = [];
                    focusedGroup = '__all__';
                } else {
                    rects = divisionRectsByDimension[dimKey] ?? [];
                    focusedGroup = null;
                }
                focusedPoint = null;
            } else if (node.derivedNode === 'sepal_length') {
                const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
                rects = [{ x1: lo, x2: hi, y1: globalYMin, y2: globalYMax, lineWidth: 2 }];
                focusedGroup = null;
                focusedPoint = null;
            } else if (node.derivedNode === 'petal_length') {
                const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
                rects = [{ x1: globalXMin, x2: globalXMax, y1: lo, y2: hi, lineWidth: 2 }];
                focusedGroup = null;
                focusedPoint = null;
            } else if (node.derivedNode === 'species') {
                rects = [];
                focusedGroup = node.data?.species ?? null;
                focusedPoint = null;
            } else {
                rects = [];
                focusedGroup = node.data?.species ?? null;
                focusedPoint = { x: +node.data.sepal_length, y: +node.data.petal_length };
            }
            redraw({});
            syncAriaSelected(node);
        },
        onExit() {
            rects = [];
            focusedGroup = null;
            focusedPoint = null;
            redraw({});
        },
        onClick(node) {
            toggleNode(node);
            syncAriaSelected(node);
        }
    });
    buildDivisionRects();
}

redraw({});
initWrapper('text');

document.getElementById('ie-keyboard')?.addEventListener('change', e => {
    initWrapper(e.target.checked ? 'keyboard' : 'text');
});
```

```js [chart.js]
export const data = [
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

const colors = { setosa: '#e41a1c', versicolor: '#377eb8', virginica: '#4daf4a' };

let currentPlotView = null;

// Renders the Bokeh chart. onTap is called with the data index when the user clicks a point.
export function drawChart({ selectedIds, rects = [], focusedGroup = null, focusedPoint = null, onTap } = {}) {
    const container = document.getElementById('ie-chart-inner');
    container.innerHTML = '';
    const plt = Bokeh.Plotting;
    const p = plt.figure({
        height: 320,
        width: 480,
        title: 'Iris: sepal length vs petal length (click points to select)',
        x_axis_label: 'Sepal length (cm)',
        y_axis_label: 'Petal length (cm)',
        toolbar_location: null,
        output_backend: 'svg'
    });

    // Bin indicator rectangles
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

    // Base scatter — ColumnDataSource enables TapTool click events and HoverTool tooltips
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

    // Selected point rings
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

    // Colored rings around focused-group points
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

    // Individual focus indicator
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

    // CustomJS bridges BokehJS's click into our JS closure via a stable global.
    // window.__bokehIeTap is overwritten each drawChart() so it always captures
    // the current onTap reference.
    if (onTap) {
        window.__bokehIeTap = idx => onTap(idx);
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
    }

    plt.show(p, '#ie-chart-inner').then(v => {
        // Properly destroy the old BokehJS view before clearing the DOM.
        if (currentPlotView) {
            try {
                currentPlotView.remove();
            } catch (_) {}
            currentPlotView = null;
        }
        currentPlotView = v;
    });
}

// Renders the selection table below the chart.
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
        th.style.cssText = 'border:1px solid #ccc; padding:4px 8px; text-align:left; background:#f5f5f5;';
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    selected.forEach(d => {
        const row = tbody.insertRow();
        [d.pt, d.sepal_length, d.petal_length, d.species].forEach(val => {
            const td = row.insertCell();
            td.textContent = val;
            td.style.cssText = 'border:1px solid #ccc; padding:4px 8px;';
        });
    });

    containerEl.innerHTML = '';
    containerEl.appendChild(table);
}
```

```html [index.html]
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Interactive Elements — Data Navigator Bokeh Wrapper</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/data-navigator/text-chat.css" />
        <script src="https://cdn.bokeh.org/bokeh/release/bokeh-3.7.3.min.js" crossorigin="anonymous"></script>
        <script src="https://cdn.bokeh.org/bokeh/release/bokeh-gl-3.7.3.min.js" crossorigin="anonymous"></script>
        <script src="https://cdn.bokeh.org/bokeh/release/bokeh-widgets-3.7.3.min.js" crossorigin="anonymous"></script>
        <script src="https://cdn.bokeh.org/bokeh/release/bokeh-api-3.7.3.min.js" crossorigin="anonymous"></script>
        <script type="importmap">
            {
                "imports": {
                    "@data-navigator/bokeh-wrapper": "https://esm.sh/@data-navigator/bokeh-wrapper",
                    "data-navigator": "https://esm.sh/data-navigator"
                }
            }
        </script>
    </head>
    <body>
        <div id="ie-plot" style="display:inline-block;">
            <div id="ie-chart-inner"></div>
        </div>
        <label>
            <input type="checkbox" id="ie-keyboard" />
            Use keyboard navigation
        </label>
        <div id="ie-chat" style="max-width:500px;"></div>
        <h3 id="ie-table-title" aria-live="polite">0 Selected Data Points</h3>
        <div id="ie-table-container"></div>
        <script type="module" src="./wrapper.js"></script>
    </body>
</html>
```

:::
