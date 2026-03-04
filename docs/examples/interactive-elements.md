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

<label class="dn-nav-toggle" style="display:block;margin:0.5em 0;">
  <input type="checkbox" id="ie-keyboard">
  Use keyboard navigation
</label>

<div v-show="keyboardMode" class="dn-keyboard-controls">

| Key | Action |
|-----|--------|
| Enter navigation area button | Start keyboard navigation |
| <kbd>←</kbd> <kbd>→</kbd> | Navigate between sepal-length bins (or data points at leaf level) |
| <kbd>↑</kbd> <kbd>↓</kbd> | Navigate between petal-length bins (or data points at leaf level) |
| <kbd>[</kbd> <kbd>]</kbd> | Navigate between species groups (or data points at leaf level) |
| <kbd>Enter</kbd> | Drill in |
| <kbd>Space</kbd> | **Select / deselect current element** (also selects all children if at a group level) |
| <kbd>W</kbd> | Go up to sepal-length level |
| <kbd>J</kbd> | Go up to petal-length level |
| <kbd>\\</kbd> | Go up to species level |
| <kbd>Backspace</kbd> | Go back to chart root |
| <kbd>Escape</kbd> | Exit navigation |

</div>

<div id="ie-chat" style="max-width:500px;margin-top:0.5em;"></div>

<h3 id="ie-table-title" aria-live="polite">0 Selected Data Points</h3>
<div id="ie-table-container"></div>

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
    data.forEach(d => {
      const isSelected = selectedIds.has(d.pt);
      p.scatter({ marker:'circle', x:[d.sepal_length], y:[d.petal_length], size:8,
                  fill_color:colors[d.species], line_color:colors[d.species], line_width:1,
                  fill_alpha: isSelected ? 1.0 : (selectedIds.size > 0 ? 0.3 : 0.7) });
    });
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
    plt.show(p, '#ie-chart-inner');
    requestAnimationFrame(() => {
      const svg = document.querySelector('#ie-chart-inner svg');
      if (!svg) return;
      svg.querySelectorAll('circle').forEach((circle, i) => {
        circle.style.cursor = 'pointer';
        circle.addEventListener('click', () => {
          if (i < data.length) {
            const d = data[i];
            if (selectedIds.has(d.pt)) selectedIds.delete(d.pt);
            else selectedIds.add(d.pt);
            renderTable();
            const navEl = document.getElementById(d.pt);
            if (navEl) navEl.setAttribute('aria-selected', String(selectedIds.has(d.pt)));
            drawChart();
          }
        });
      });
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

onUnmounted(() => wrapper?.destroy());
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
const getLeafIds = (node) => {
  if (!node.derivedNode) return [node.id];              // leaf
  if (node.data?.dimensionKey) {                        // dimension root
    const ids = [];
    for (const div of Object.values(node.data.divisions || {}))
      ids.push(...Object.keys(div.values || {}));
    return ids;
  }
  return Object.keys(node.data?.values || {});          // division
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
      el.setAttribute('aria-selected',
        String(leafIds.length > 0 && leafIds.every(id => selectedIds.has(id))));
    }
  },
  onClick(node) {
    // Works for leaf, division (group), and dimension (all) nodes
    const leafIds = getLeafIds(node);
    const allSelected = leafIds.every(id => selectedIds.has(id));
    if (allSelected) leafIds.forEach(id => selectedIds.delete(id));
    else             leafIds.forEach(id => selectedIds.add(id));

    updateSelectionTable(selectedIds, data);
    redrawChart(selectedIds, data);

    const el = document.getElementById(node.id);
    if (el) el.setAttribute('aria-selected', String(!allSelected));
  },
});
```

### How Space triggers selection in keyboard mode

When `onClick` is provided and `mode` includes keyboard navigation, Data Navigator automatically adds a <kbd>Space</kbd> keydown handler to each navigated element. Pressing <kbd>Space</kbd> calls `onClick(node)` — the same callback that fires when a user types `"select"` in the text chat or clicks the chart with a mouse.

The wrapper also sets `aria-selected="false"` as an initial attribute. Your `onNavigate` and `onClick` callbacks are responsible for updating this value as selection changes (since only your code knows which items are selected).

### Group-level selection

Navigating to a **division** (e.g. the `setosa` species node) or a **dimension root** (e.g. the species dimension) and pressing <kbd>Space</kbd> (or typing `"select"`) passes that node to `onClick`. Using the `getLeafIds` helper above, you can enumerate all the leaf data points belonging to that group and toggle them in bulk. This lets keyboard and screen reader users efficiently select entire groups — not just individual points.
