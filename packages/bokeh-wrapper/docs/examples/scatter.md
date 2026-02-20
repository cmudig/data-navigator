# Scatter Plot

A scatter plot of the classic [Iris dataset](https://en.wikipedia.org/wiki/Iris_flower_data_set) — sepal length vs. petal length coloured by species. The wrapper uses `type: 'cartesian'` to build a **dual-dimension** navigation structure: navigate across sepal-length bins with ← →, navigate across petal-length bins with ↑ ↓. At the deepest level all four arrow keys stay active so users can roam freely across both axes.

## Live example

<div id="scatter-plot" style="display:inline-block;"><div id="scatter-chart-inner"></div></div>

<label class="dn-nav-toggle">
  <input type="checkbox" id="scatter-keyboard">
  Use keyboard navigation
</label>

<div v-show="keyboardMode" class="dn-keyboard-controls">

| Key | Action |
|-----|--------|
| Enter navigation area button | Start keyboard navigation |
| <kbd>←</kbd> <kbd>→</kbd> | Navigate between sepal-length bins (or data points at leaf level) |
| <kbd>↑</kbd> <kbd>↓</kbd> | Navigate between petal-length bins (or data points at leaf level) |
| <kbd>Enter</kbd> | Drill in |
| <kbd>W</kbd> | Go up to sepal-length level |
| <kbd>J</kbd> | Go up to petal-length level |
| <kbd>Backspace</kbd> | Go back to chart root (from dimension roots) |
| <kbd>Escape</kbd> | Exit navigation |

</div>

<div id="scatter-chat" style="max-width:500px;"></div>

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
  await waitFor(() => document.getElementById('scatter-plot'));

  // Abridged Iris dataset (15 rows for demo clarity).
  // No top-level `id` field — the wrapper will derive stable IDs using idField.
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

  // Precompute global data bounds and padding for the focus rectangle.
  const globalXMin = Math.min(...data.map(d => d.sepal_length));
  const globalXMax = Math.max(...data.map(d => d.sepal_length));
  const globalYMin = Math.min(...data.map(d => d.petal_length));
  const globalYMax = Math.max(...data.map(d => d.petal_length));
  const xPad = (globalXMax - globalXMin) * 0.05;
  const yPad = (globalYMax - globalYMin) * 0.05;

  // Focus rectangles: [{ x1, x2, y1, y2, lineWidth }]. Each rect is stroke-only, no fill.
  let rects = [];
  let divisionRectsByDimension = {};

  const drawChart = () => {
    const container = document.getElementById('scatter-chart-inner');
    container.innerHTML = '';
    const plt = Bokeh.Plotting;
    const p = plt.figure({
      height: 320, width: 480,
      title: 'Iris: sepal length vs petal length',
      x_axis_label: 'Sepal length (cm)',
      y_axis_label: 'Petal length (cm)',
      toolbar_location: null,
      output_backend: 'svg',
    });

    // Focus rectangles (stroke only, no fill) drawn behind the data points.
    for (const rect of rects) {
      p.quad({
        left: [rect.x1], right: [rect.x2],
        bottom: [rect.y1], top: [rect.y2],
        fill_alpha: 0,
        line_color: '#333',
        line_width: rect.lineWidth,
      });
    }

    // All scatter points rendered identically — no dimming or size changes.
    data.forEach(d => {
      p.scatter({
        marker: 'circle',
        x: [d.sepal_length],
        y: [d.petal_length],
        size: 8,
        fill_color: colors[d.species],
        line_color: colors[d.species],
        line_width: 1,
        fill_alpha: 0.7,
      });
    });

    plt.show(p, '#scatter-chart-inner');
  };

  drawChart();

  ({ addDataNavigator } = await import('@data-navigator/bokeh-wrapper'));

  // Indexes all bin boundary rects from the structure, keyed by dimension field name,
  // so the dimension root level can display every bin of that dimension at once.
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
    divisionRectsByDimension = {};
    drawChart();
    wrapper = addDataNavigator({
      plotContainer: 'scatter-plot',
      chatContainer: 'scatter-chat',
      mode,
      data,
      type: 'cartesian',
      xField: 'sepal_length',
      yField: 'petal_length',
      idField: 'pt',
      title: 'Iris: sepal length vs petal length',
      onNavigate(node) {
        const level = node.dimensionLevel;
        if (level === 0) {
          // Chart root — grid overlay: all bins from both dimensions at once (1px)
          rects = Object.values(divisionRectsByDimension).flat();
        } else if (level === 1) {
          // Dimension root — show every bin of this dimension at once (1px)
          const dimKey = node.data?.dimensionKey;
          rects = divisionRectsByDimension[dimKey] ?? [];
        } else if (node.derivedNode) {
          // Division node — exact bin boundary, no padding, 2px
          const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
          if (node.derivedNode === 'sepal_length') {
            rects = [{ x1: lo, x2: hi, y1: globalYMin, y2: globalYMax, lineWidth: 2 }];
          } else {
            rects = [{ x1: globalXMin, x2: globalXMax, y1: lo, y2: hi, lineWidth: 2 }];
          }
        } else {
          // Leaf node — small padded box around the individual point, 2px
          rects = [{
            x1: +node.data.sepal_length - xPad, x2: +node.data.sepal_length + xPad,
            y1: +node.data.petal_length - yPad, y2: +node.data.petal_length + yPad,
            lineWidth: 2,
          }];
        }
        drawChart();
      },
      onExit() {
        rects = [];
        drawChart();
      },
    });
    buildDivisionRects();
  };

  initWrapper('text');

  document.getElementById('scatter-keyboard')?.addEventListener('change', e => {
    keyboardMode.value = e.target.checked;
    initWrapper(e.target.checked ? 'keyboard' : 'text');
  });
});

onUnmounted(() => wrapper?.destroy());
</script>

## Code

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';

const data = [
  { pt: 's1', sepal_length: 5.1, petal_length: 1.4, species: 'setosa' },
  // ...
];

// Global bounds for band spans; padding only used for the leaf-node box.
const globalXMin = Math.min(...data.map(d => d.sepal_length));
const globalXMax = Math.max(...data.map(d => d.sepal_length));
const globalYMin = Math.min(...data.map(d => d.petal_length));
const globalYMax = Math.max(...data.map(d => d.petal_length));
const xPad = (globalXMax - globalXMin) * 0.05;
const yPad = (globalYMax - globalYMin) * 0.05;

let rects = []; // [{ x1, x2, y1, y2, lineWidth }] drawn as stroke-only quads
let divisionRectsByDimension = {}; // pre-built per-dimension rect arrays

const wrapper = addDataNavigator({
  plotContainer: '#scatter-plot',
  data,
  type: 'cartesian',
  xField: 'sepal_length',   // navigated with ← →  (sorted, binned automatically)
  yField: 'petal_length',   // navigated with ↑ ↓  (sorted, binned automatically)
  idField: 'pt',            // unique key used to identify each point
  title: 'Iris: sepal length vs petal length',
  onNavigate(node) {
    const level = node.dimensionLevel;
    if (level === 0) {
      // Chart root — grid overlay: all bins from both dimensions at once (1px)
      rects = Object.values(divisionRectsByDimension).flat();
    } else if (level === 1) {
      // Dimension root — show every bin of this dimension at once (1px)
      rects = divisionRectsByDimension[node.data?.dimensionKey] ?? [];
    } else if (node.derivedNode) {
      // Division node — exact bin boundary, no padding, 2px
      const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
      rects = node.derivedNode === 'sepal_length'
        ? [{ x1: lo, x2: hi, y1: globalYMin, y2: globalYMax, lineWidth: 2 }]
        : [{ x1: globalXMin, x2: globalXMax, y1: lo, y2: hi, lineWidth: 2 }];
    } else {
      // Leaf node — small padded box around the point, 2px
      rects = [{
        x1: +node.data.sepal_length - xPad, x2: +node.data.sepal_length + xPad,
        y1: +node.data.petal_length - yPad, y2: +node.data.petal_length + yPad,
        lineWidth: 2,
      }];
    }
    redrawChart(); // re-render: rects.forEach(r => p.quad({ left:[r.x1], right:[r.x2], bottom:[r.y1], top:[r.y2], fill_alpha:0, line_color:'#333', line_width:r.lineWidth }))
  },
  onExit() { rects = []; redrawChart(); },
});

// After creation, index all division boundary rects keyed by dimension field name.
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
```

## Structure

For `type: 'cartesian'` the navigation hierarchy has **two independent numerical dimensions** that share the same leaf nodes. Each numerical dimension is automatically divided into bins:

```
chart root
  ├─ sepal_length dimension  (← →)
  │    ├─ bin 1  [~4.7 – 5.3]
  │    │    ├─ s3: sepal 4.7, petal 1.3   ← leaf (all four arrow keys active)
  │    │    ├─ s2: sepal 4.9, petal 1.4
  │    │    └─ ... (setosa points)
  │    ├─ bin 2  [~5.3 – 5.9]
  │    │    └─ ...
  │    └─ ... (bins continue to max sepal length)
  └─ petal_length dimension  (↑ ↓)
       ├─ bin 1  [~1.0 – 2.25]
       │    └─ ... (same leaf nodes, reached via a different path)
       └─ ...
```

### Navigation summary

| Location | ← → | ↑ ↓ | Enter | W | J | Backspace |
|----------|-----|-----|-------|---|---|-----------|
| Chart root | — | — | Go to sepal_length dimension | — | — | — |
| sepal_length dimension root | Go to petal_length dimension | — | Go to first bin | — | — | Chart root |
| sepal_length bin | Previous / next bin | — | Go to first leaf | sepal_length dimension | — | — |
| petal_length dimension root | Go to sepal_length dimension | — | Go to first bin | — | — | Chart root |
| petal_length bin | — | Previous / next bin | Go to first leaf | — | petal_length dimension | — |
| Leaf | Previous / next sepal bin | Previous / next petal bin | — | Parent sepal bin | Parent petal bin | — |

- The bin count is derived automatically as `ceil(sqrt(N))` (minimum 3), where N is the number of data points.
- Bins are sorted in ascending order and use **terminal** extents — navigation stops at the first / last bin rather than wrapping.
- Use `idField` to specify which data field uniquely identifies each point; without it the wrapper generates sequential IDs.
