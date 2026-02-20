# Cross-navigable Line Chart

A multi-line chart showing monthly average temperatures for three cities. The wrapper uses `type: 'crossline'` with `xField: 'month'` and `groupField: 'city'` to build a **dual-dimension** navigation structure: navigate across months with ← →, navigate between cities with ↑ ↓. At the deepest level all four arrow keys stay active so users can roam freely without drilling back up.

This is different from `type: 'multiline'`, which organises the structure around one dimension (cities) only. With `'crossline'` both the x-axis and the series axis are first-class navigation dimensions.

## Live example

<div id="cross-plot" style="display:inline-block;"><div id="cross-chart-inner"></div></div>

<label class="dn-nav-toggle">
  <input type="checkbox" id="cross-keyboard">
  Use keyboard navigation
</label>

<div v-show="keyboardMode" class="dn-keyboard-controls">

| Key | Action |
|-----|--------|
| Enter navigation area button | Start keyboard navigation |
| <kbd>←</kbd> <kbd>→</kbd> | Navigate between months (or cities at the deepest level) |
| <kbd>↑</kbd> <kbd>↓</kbd> | Navigate between cities (or months at the deepest level) |
| <kbd>Enter</kbd> | Drill in |
| <kbd>W</kbd> | Go up to month level |
| <kbd>J</kbd> | Go up to city level |
| <kbd>Backspace</kbd> | Go back to chart root (from dimension roots) |
| <kbd>Escape</kbd> | Exit navigation |

</div>

<div id="cross-chat" style="max-width:500px;"></div>

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
  await waitFor(() => document.getElementById('cross-plot'));

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const cityData = {
    'New York': [0,  2,  7, 13, 19, 24, 27, 26, 22, 15,  9,  3],
    'London':   [5,  5,  7, 10, 14, 17, 19, 18, 15, 11,  7,  5],
    'Sydney':   [22, 22, 20, 17, 14, 11, 10, 11, 13, 16, 19, 21],
  };
  const colors = { 'New York': '#e41a1c', 'London': '#377eb8', 'Sydney': '#ff7f00' };

  // Flatten for data-navigator
  const data = [];
  for (const [city, temps] of Object.entries(cityData)) {
    months.forEach((month, i) => {
      data.push({ city, month, month_index: i, temp_c: temps[i] });
    });
  }

  let focusedCity = null;
  let focusedMonth = null;

  const drawChart = () => {
    const container = document.getElementById('cross-chart-inner');
    container.innerHTML = '';
    const plt = Bokeh.Plotting;
    const p = plt.figure({
      height: 300, width: 550,
      title: 'Monthly average temperatures',
      x_range: months,
      y_axis_label: '°C',
      toolbar_location: null,
      output_backend: 'svg',
    });

    for (const [city, temps] of Object.entries(cityData)) {
      const isFocusedLine = focusedCity === '__all__' || focusedCity === city;
      const dimmed = focusedCity != null && focusedCity !== '__all__' && !isFocusedLine;
      p.line(months, temps, {
        line_color: colors[city],
        // Thicken the line only when focused at the series level (no month selected)
        line_width: isFocusedLine && focusedMonth == null ? 3 : 1.5,
        line_alpha: dimmed ? 0.3 : 1.0,
        legend_label: city,
      });
      // Draw a dot at focusedMonth for every focused city
      // When focusedCity === '__all__' (month division) this draws dots at all three cities
      if (focusedMonth != null && isFocusedLine) {
        const idx = months.indexOf(focusedMonth);
        if (idx >= 0) {
          p.scatter({
            x: [focusedMonth],
            y: [temps[idx]],
            marker: 'circle',
            size: 12,
            fill_color: colors[city],
            line_color: '#000',
            line_width: 2,
          });
        }
      }
    }

    p.legend.location = 'top_left';
    plt.show(p, '#cross-chart-inner');
  };

  drawChart();

  ({ addDataNavigator } = await import('@data-navigator/bokeh-wrapper'));

  const initWrapper = (mode) => {
    wrapper?.destroy();
    focusedCity = null;
    focusedMonth = null;
    drawChart();
    wrapper = addDataNavigator({
      plotContainer: 'cross-plot',
      chatContainer: 'cross-chat',
      mode,
      data,
      type: 'crossline',
      xField: 'month',
      yField: 'temp_c',
      groupField: 'city',
      title: 'Monthly average temperatures',
      onNavigate(node) {
        if (!node.derivedNode) {
          // Leaf node — or the chart root, which has no city/month in its data.
          // Falling back to '__all__' means all lines are highlighted on first entry.
          focusedCity = node.data?.city ?? '__all__';
          focusedMonth = node.data?.month ?? null;
        } else if (node.derivedNode === 'month') {
          // Month dimension root or a specific month division.
          // Always show all cities (dots will appear at focusedMonth for every city).
          focusedMonth = node.data?.month ?? null;
          focusedCity = '__all__';
        } else if (node.derivedNode === 'city') {
          // City dimension root or a specific city division.
          // null means we are at the dimension root → highlight all lines.
          focusedCity = node.data?.city ?? '__all__';
          focusedMonth = null;
        }
        drawChart();
      },
      onExit() {
        focusedCity = null;
        focusedMonth = null;
        drawChart();
      },
    });
  };

  initWrapper('text');

  document.getElementById('cross-keyboard')?.addEventListener('change', e => {
    keyboardMode.value = e.target.checked;
    initWrapper(e.target.checked ? 'keyboard' : 'text');
  });
});

onUnmounted(() => wrapper?.destroy());
</script>

## Code

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';

// Flatten multi-series data into one record per (city, month)
const data = [
  { city: 'New York', month: 'Jan', month_index: 0, temp_c: 0  },
  { city: 'New York', month: 'Feb', month_index: 1, temp_c: 2  },
  // ... all cities × months
];

const wrapper = addDataNavigator({
  plotContainer: '#cross-plot',
  data,
  type: 'crossline',
  xField: 'month',      // navigated with ← →
  yField: 'temp_c',
  groupField: 'city',   // navigated with ↑ ↓
  title: 'Monthly average temperatures',
  onNavigate(node) {
    if (!node.derivedNode) {
      // Leaf or chart root. Chart root has no city/month → defaults to '__all__',
      // highlighting all lines on entry. Leaf nodes have specific city + month.
      highlightPoint(node.data?.city ?? '__all__', node.data?.month ?? null);
    } else if (node.derivedNode === 'month') {
      // Month dimension/division — show dots at ALL cities for this month
      // node.data.month is null at the dimension root, a string at a division
      highlightMonth(node.data?.month ?? null);
    } else if (node.derivedNode === 'city') {
      // City dimension/division — highlight this city's line
      // node.data.city is null at the dimension root, a string at a division
      highlightCity(node.data?.city ?? '__all__');
    }
  },
  onExit() {
    clearHighlight();
  },
});
```

## Structure

For `type: 'crossline'` the navigation hierarchy has **two independent dimensions** that share the same leaf nodes:

```
chart root
  ├─ month dimension  (← →)
  │    ├─ Jan division
  │    │    ├─ New York: 0°C   ← leaf (all four arrow keys active here)
  │    │    ├─ London: 5°C
  │    │    └─ Sydney: 22°C
  │    ├─ Feb division
  │    │    └─ ...
  │    └─ ... (12 months total)
  └─ city dimension   (↑ ↓)
       ├─ New York division
       │    ├─ Jan: 0°C        ← same leaf nodes, reached via a different path
       │    ├─ Feb: 2°C
       │    └─ ... (12 months)
       ├─ London division
       │    └─ ...
       └─ Sydney division
            └─ ...
```

### Navigation summary

| Location | ← → | ↑ ↓ | Enter | W | J | Backspace |
|----------|-----|-----|-------|---|---|-----------|
| Chart root | — | — | Go to month dimension | — | — | — |
| Month dimension root | Go to city dimension | — | Go to first month | — | — | Chart root |
| Month division | Previous / next month | — | Go to first leaf | Month dimension | — | — |
| City dimension root | Go to month dimension | — | Go to first city | — | — | Chart root |
| City division | — | Previous / next city | Go to first leaf | — | City dimension | — |
| Leaf | Previous / next month | Previous / next city | — | Parent month division | Parent city division | — |

When navigating at a **month division**, the chart shows dots at every city for that month — a cross-section of the data across all series. When navigating at a **city division**, only that city's line is highlighted. At the leaf (deepest) level, the dot for the specific city and month is shown, and all four arrow keys move freely across both axes.
