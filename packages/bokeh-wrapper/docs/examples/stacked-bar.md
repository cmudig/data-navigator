# Stacked Bar Chart

A stacked bar chart showing browser market share by year, adapted from the [Bokeh documentation gallery](https://docs.bokeh.org/en/latest/docs/gallery/bar_stacked.html). The wrapper uses `type: 'stacked_bar'` with `xField: 'year'` and `groupField: 'browser'` to build a **dual-dimension** navigation structure: navigate across years with ← →, navigate between browsers with ↑ ↓. At the deepest level all four arrow keys stay active so users can roam freely without drilling back up.

## Live example

<div id="stacked-plot"><div id="stacked-chart-inner"></div></div>

<label class="dn-nav-toggle">
  <input type="checkbox" id="stacked-keyboard">
  Use keyboard navigation
</label>

<div v-show="keyboardMode" class="dn-keyboard-controls">

| Key | Action |
|-----|--------|
| Enter navigation area button | Start keyboard navigation |
| <kbd>←</kbd> <kbd>→</kbd> | Navigate between years (or browsers at the deepest level) |
| <kbd>↑</kbd> <kbd>↓</kbd> | Navigate between browsers (or years at the deepest level) |
| <kbd>Enter</kbd> | Drill in |
| <kbd>W</kbd> | Go up to year level |
| <kbd>J</kbd> | Go up to browser level |
| <kbd>Backspace</kbd> | Go back to chart root (from dimension roots) |
| <kbd>Escape</kbd> | Exit navigation |

</div>

<div id="stacked-chat" style="max-width:500px;"></div>

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
  await waitFor(() => document.getElementById('stacked-plot'));

  const years = ['2015', '2016', '2017'];
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Other'];
  // Shares as integer percentages
  const shares = {
    Chrome:  [62, 63, 65],
    Firefox: [12, 12, 11],
    Safari:  [11, 12, 12],
    Edge:    [ 4,  4,  4],
    Other:   [11,  9,  8],
  };
  const palette = ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f'];

  // Flatten for data-navigator
  const data = [];
  browsers.forEach((browser, bi) => {
    years.forEach((year, yi) => {
      data.push({ year, browser, share: shares[browser][yi] });
    });
  });

  let focusedYear = null;
  let focusedBrowser = null;
  // Tracks which dimension is active so drawChart can produce the right encoding cue.
  // 'root' = chart root, 'year' = year dimension/division, 'browser' = browser dimension/division
  let focusedDimension = null;

  const drawChart = () => {
    const container = document.getElementById('stacked-chart-inner');
    container.innerHTML = '';
    const plt = Bokeh.Plotting;
    const p = plt.figure({
      x_range: years,
      y_range: [0, 110],
      height: 300, width: 400,
      title: 'Browser market share (%)',
      y_axis_label: 'Market share (%)',
      toolbar_location: null,
      output_backend: 'svg',
    });

    let bottoms = { '2015': 0, '2016': 0, '2017': 0 };
    browsers.forEach((browser, bi) => {
      const tops = years.map((y, yi) => bottoms[y] + shares[browser][yi]);
      const bots = years.map(y => bottoms[y]);
      years.forEach((y, yi) => { bottoms[y] = tops[yi]; });

      const isFocusedBrowser = focusedBrowser === browser;

      // Segment borders are used for browser-level navigation only.
      // Browser dim root highlights all segments; division/leaf highlights just the focused browser.
      const shouldHighlight = (y) => {
        if (focusedDimension === 'root' || (focusedDimension === 'browser' && focusedBrowser == null)) return true;
        if (focusedBrowser == null) return false;
        return isFocusedBrowser && (focusedYear === '__all__' || y === focusedYear);
      };

      const lineColor = years.map(y => shouldHighlight(y) ? '#000' : 'white');
      const lineWidth = years.map(y => shouldHighlight(y) ? 2 : 0.5);
      const fillAlpha = focusedBrowser != null && !isFocusedBrowser ? 0.3 : 1.0;

      // Real bars — accurate per-bar borders, no legend_label so the legend
      // square is driven independently below.
      p.vbar({
        x: years,
        top: tops,
        bottom: bots,
        width: 0.8,
        color: palette[bi],
        line_color: lineColor,
        line_width: lineWidth,
        fill_alpha: fillAlpha,
      });

      // Zero-size legend proxy: owns legend_label and carries a scalar line_color
      // so Bokeh uses it for the legend square styling rather than line_color[0]
      // of the per-bar array above. Invisible (zero width and height) but always
      // present so the legend entry is stable across redraws.
      p.vbar({
        x: [years[0]], top: [0], bottom: [0], width: 0,
        color: palette[bi],
        line_color: isFocusedBrowser && focusedBrowser != null ? '#000' : 'white',
        line_width: isFocusedBrowser && focusedBrowser != null ? 2 : 0.5,
        fill_alpha: fillAlpha,
        legend_label: browser,
      });
    });

    // Year-level nav: draw a single outline rect spanning the full stack.
    // Only active when navigating the year dimension (root or division), not at browser/leaf level.
    const drawYearRect = (y) => {
      const yi = years.indexOf(y);
      const totalHeight = browsers.reduce((sum, b) => sum + shares[b][yi], 0);
      p.rect({
        x: [y],
        y: [totalHeight / 2],
        width: 0.85,
        height: totalHeight,
        fill_alpha: 0,
        line_color: '#000',
        line_width: 2,
      });
    };
    if (focusedDimension === 'root' || (focusedDimension === 'year' && focusedYear == null)) {
      // Chart root or year dimension root — outline all year columns
      years.forEach(drawYearRect);
    } else if (focusedDimension === 'year' && focusedYear != null) {
      // Specific year division — outline just that column
      drawYearRect(focusedYear);
    }

    p.legend.location = 'top_right';
    plt.show(p, '#stacked-chart-inner');
  };

  drawChart();

  ({ addDataNavigator } = await import('@data-navigator/bokeh-wrapper'));

  const initWrapper = (mode) => {
    wrapper?.destroy();
    focusedYear = null;
    focusedBrowser = null;
    focusedDimension = null;
    drawChart();
    wrapper = addDataNavigator({
      plotContainer: 'stacked-plot',
      chatContainer: 'stacked-chat',
      mode,
      data,
      type: 'stacked_bar',
      xField: 'year',
      yField: 'share',
      groupField: 'browser',
      title: 'Browser market share (%)',
      onNavigate(node) {
        if (!node.derivedNode) {
          // Chart root has no year/browser; leaf nodes have both.
          const isChartRoot = node.data?.year == null && node.data?.browser == null;
          if (isChartRoot) {
            focusedDimension = 'root';
            focusedYear = '__all__';
            focusedBrowser = null;
          } else {
            // Leaf node — specific (year, browser) segment
            focusedDimension = null;
            focusedYear = node.data?.year ?? null;
            focusedBrowser = node.data?.browser ?? null;
          }
        } else if (node.derivedNode === 'year') {
          // Year dimension root (null year) or a specific year division
          focusedDimension = 'year';
          focusedYear = node.data?.year ?? null;
          focusedBrowser = null;
        } else if (node.derivedNode === 'browser') {
          // Browser dimension root (null browser) or a specific browser division
          focusedDimension = 'browser';
          focusedYear = '__all__';
          focusedBrowser = node.data?.browser ?? null;
        }
        drawChart();
      },
      onExit() {
        focusedYear = null;
        focusedBrowser = null;
        focusedDimension = null;
        drawChart();
      },
    });
  };

  initWrapper('text');

  document.getElementById('stacked-keyboard')?.addEventListener('change', e => {
    keyboardMode.value = e.target.checked;
    initWrapper(e.target.checked ? 'keyboard' : 'text');
  });
});

onUnmounted(() => wrapper?.destroy());
</script>

## Code

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';

// Flatten the stacked data into one record per (year, browser) combination
const data = [
  { year: '2015', browser: 'Chrome',  share: 62 },
  { year: '2015', browser: 'Firefox', share: 12 },
  // ... all years × browsers
];

const wrapper = addDataNavigator({
  plotContainer: 'stacked-plot',
  data,
  type: 'stacked_bar',
  xField: 'year',
  yField: 'share',
  groupField: 'browser',
  title: 'Browser market share (%)',
  onNavigate(node) {
    if (!node.derivedNode) {
      const isChartRoot = node.data?.year == null && node.data?.browser == null;
      if (isChartRoot) {
        highlight('__all__', null);   // all bars on first entry
      } else {
        highlight(node.data.year, node.data.browser);   // leaf segment
      }
    } else if (node.derivedNode === 'year') {
      // null year = year dimension root → highlight all; otherwise specific year column
      highlight(node.data?.year ?? null, null);
    } else if (node.derivedNode === 'browser') {
      // null browser = browser dimension root → all years; otherwise specific browser
      highlight('__all__', node.data?.browser ?? null);
    }
  },
  onExit() {
    clearHighlight();
  },
});
```

## Structure

For `type: 'stacked_bar'` the navigation hierarchy is a dual-dimension cross-navigable graph.
Both the `year` (x-axis) and `browser` (group) fields become first-class navigation dimensions
that share the same leaf nodes:

```
Chart root
├─ year dimension
│   ├─ 2015 division
│   │   ├─ Chrome:  62%
│   │   ├─ Firefox: 12%
│   │   ├─ Safari:  11%
│   │   ├─ Edge:     4%
│   │   └─ Other:   11%
│   ├─ 2016 division → ...
│   └─ 2017 division → ...
└─ browser dimension
    ├─ Chrome division → 2015: 62%, 2016: 63%, 2017: 65%
    ├─ Firefox division → ...
    ├─ Safari division → ...
    ├─ Edge division → ...
    └─ Other division → ...
```

- `← →` navigates between year divisions (at year dimension level)
- `↑ ↓` navigates between browser divisions (at browser dimension level)
- `Enter` drills into the current dimension's divisions, or from a division to its data points
- `W` returns to the year dimension
- `J` returns to the browser dimension
- At the leaf (data point) level, all four arrow keys remain active for free 2D roaming
