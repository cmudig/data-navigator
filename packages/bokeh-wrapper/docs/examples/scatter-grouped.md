# Grouped Scatter Plot

The same [Iris dataset](https://en.wikipedia.org/wiki/Iris_flower_data_set) as the basic scatter example, now with a **third navigation axis** for species. Pass `groupField: 'species'` alongside `type: 'cartesian'` to get a three-dimensional navigation structure: ← → for sepal-length bins, ↑ ↓ for petal-length bins, and <kbd>[</kbd> <kbd>]</kbd> to jump between species groups. Use <kbd>\\</kbd> to navigate up to the species dimension.

## Live example

<div id="gs-plot" style="display:inline-block;"><div id="gs-chart-inner"></div></div>

<label class="dn-nav-toggle">
  <input type="checkbox" id="gs-keyboard">
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
| <kbd>W</kbd> | Go up to sepal-length level |
| <kbd>J</kbd> | Go up to petal-length level |
| <kbd>\\</kbd> | Go up to species level |
| <kbd>Backspace</kbd> | Go back to chart root (from dimension roots) |
| <kbd>Escape</kbd> | Exit navigation |

</div>

<div id="gs-chat" style="max-width:500px;"></div>

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
  await waitFor(() => document.getElementById('gs-plot'));

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

  // Focus rectangles for x / y bin indicators.
  let rects = [];
  // null     → no group highlight (render all normally)
  // '__all__' → show colored rings on every point
  // 'setosa' etc → dim other species, show rings on focused species
  let focusedGroup = null;
  // Individual point indicator at leaf level.
  let focusedPoint = null;
  let divisionRectsByDimension = {};

  const drawChart = () => {
    const container = document.getElementById('gs-chart-inner');
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

    // x / y bin indicator rectangles.
    for (const rect of rects) {
      p.quad({
        left: [rect.x1], right: [rect.x2],
        bottom: [rect.y1], top: [rect.y2],
        fill_alpha: 0,
        line_color: '#333',
        line_width: rect.lineWidth,
      });
    }

    // Base scatter — all points at full opacity regardless of group focus.
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

    // Colored rings around focused-group points.
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

    // Individual point indicator (leaf level).
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

    plt.show(p, '#gs-chart-inner');
  };

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
      plotContainer: 'gs-plot',
      chatContainer: 'gs-chat',
      mode,
      data,
      type: 'cartesian',
      xField: 'sepal_length',
      yField: 'petal_length',
      groupField: 'species',
      idField: 'pt',
      title: 'Iris: sepal length vs petal length',
      onNavigate(node) {
        const level = node.dimensionLevel;
        if (level === 0) {
          // Chart root — show all bin outlines from both numerical dimensions.
          rects = Object.values(divisionRectsByDimension).flat();
          focusedGroup = null;
          focusedPoint = null;
        } else if (level === 1) {
          // Dimension root — show all bins of this dimension, or all group rings.
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
          // Sepal-length bin — vertical stripe.
          const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
          rects = [{ x1: lo, x2: hi, y1: globalYMin, y2: globalYMax, lineWidth: 2 }];
          focusedGroup = null;
          focusedPoint = null;
        } else if (node.derivedNode === 'petal_length') {
          // Petal-length bin — horizontal stripe.
          const [lo, hi] = node.data?.numericalExtents ?? [0, 0];
          rects = [{ x1: globalXMin, x2: globalXMax, y1: lo, y2: hi, lineWidth: 2 }];
          focusedGroup = null;
          focusedPoint = null;
        } else if (node.derivedNode === 'species') {
          // Species category — highlight this group, dim others.
          rects = [];
          focusedGroup = node.data?.species ?? null;
          focusedPoint = null;
        } else {
          // Leaf node — individual point + keep its species highlighted.
          rects = [];
          focusedGroup = node.data?.species ?? null;
          focusedPoint = {
            x: +node.data.sepal_length,
            y: +node.data.petal_length,
          };
        }
        drawChart();
      },
      onExit() {
        rects = [];
        focusedGroup = null;
        focusedPoint = null;
        drawChart();
      },
    });
    buildDivisionRects();
  };

  initWrapper('text');

  document.getElementById('gs-keyboard')?.addEventListener('change', e => {
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

const colors = { setosa: '#e41a1c', versicolor: '#377eb8', virginica: '#4daf4a' };

const wrapper = addDataNavigator({
  plotContainer: 'gs-plot',
  data,
  type: 'cartesian',
  xField: 'sepal_length',
  yField: 'petal_length',
  groupField: 'species',   // ← adds the third [ / ] navigation axis
  idField: 'pt',
  title: 'Iris: sepal length vs petal length',
  onNavigate(node) {
    const level = node.dimensionLevel;
    if (level === 0) {
      // Chart root — show all bin outlines.
      showAllRects();
    } else if (level === 1) {
      const dimKey = node.data?.dimensionKey ?? node.derivedNode;
      if (dimKey === 'species') {
        showGroupRings('__all__');   // all species highlighted
      } else {
        showDimensionRects(dimKey);  // all bins of this axis
      }
    } else if (node.derivedNode === 'sepal_length') {
      showBinRect('x', node.data.numericalExtents);
    } else if (node.derivedNode === 'petal_length') {
      showBinRect('y', node.data.numericalExtents);
    } else if (node.derivedNode === 'species') {
      showGroupRings(node.data.species);  // dim other species
    } else {
      // Leaf — point indicator + keep species highlighted.
      showPointIndicator(node.data.sepal_length, node.data.petal_length);
      showGroupRings(node.data.species);
    }
  },
  onExit() { clearAll(); },
});
```

## Structure

Adding `groupField` to `type: 'cartesian'` produces a **three-dimensional** navigation graph. Each dimension shares the same leaf nodes.

```
chart root
  ├─ sepal_length dimension  (← →)
  │    ├─ bin [~4.7 – 5.3]
  │    │    ├─ s3: sepal 4.7, petal 1.3, setosa
  │    │    └─ ...
  │    └─ bin [~5.3 – 5.9] → ...
  ├─ petal_length dimension  (↑ ↓)
  │    ├─ bin [~1.0 – 2.25]
  │    │    └─ ... (same leaf nodes, different path)
  │    └─ ...
  └─ species dimension  ([ ])
       ├─ setosa  → s1, s2, s3, s4, s5
       ├─ versicolor → v1 … v5
       └─ virginica  → g1 … g5
```

### Navigation summary

| Location | ← → | ↑ ↓ | [ ] | Enter | W | J | \\ | Backspace |
|----------|-----|-----|-----|-------|---|---|----|-----------|
| Chart root | — | — | — | sepal_length dimension | — | — | — | — |
| sepal_length dimension | cycle dims | — | — | First bin | — | — | — | Chart root |
| sepal_length bin | Prev / next bin | — | — | First leaf | sepal_length dim | — | — | — |
| petal_length dimension | — | cycle dims | — | First bin | — | — | — | Chart root |
| petal_length bin | — | Prev / next bin | — | First leaf | — | petal_length dim | — | — |
| species dimension | — | — | cycle dims | First species | — | — | — | Chart root |
| species category | — | — | Prev / next species | First leaf | — | — | species dim | — |
| Leaf | Prev / next sepal bin | Prev / next petal bin | Prev / next species | — | Parent sepal bin | Parent petal bin | Parent species | — |

- At the **leaf** level all three axis controls stay active for free 3-D roaming without drilling back up.
- The sepal-length and petal-length dimensions use **terminal** extents (navigation stops at first/last bin). Species uses **circular** extents (wraps from last species back to first).
- Bin count for numerical dimensions is `ceil(sqrt(N))` (minimum 3), where N is the number of data points.
