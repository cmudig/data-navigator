# Bar Chart

A classic vertical bar chart showing fruit counts, taken from the [Bokeh documentation](https://docs.bokeh.org/en/latest/docs/gallery.html). `addDataNavigator` is called after the chart renders with no manual structure configuration — the wrapper detects the bar chart pattern from the data shape.

## Live example

<div id="bar-plot" style="display:inline-block;"><div id="bar-chart-inner"></div></div>

<label class="dn-nav-toggle">
  <input type="checkbox" id="bar-keyboard">
  Use keyboard navigation
</label>

<div id="bar-chat" style="max-width:500px;"></div>

<script setup>
import { onMounted, onUnmounted } from 'vue';

let wrapper = null;
let addDataNavigator = null;

onMounted(async () => {
  const waitFor = (check, timeout = 5000) => new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => check() ? resolve() : Date.now() - start > timeout ? reject(new Error('Timeout')) : setTimeout(poll, 50);
    poll();
  });

  await waitFor(() => typeof Bokeh !== 'undefined' && Bokeh.Plotting);
  await waitFor(() => document.getElementById('bar-plot'));

  const data = [
    { fruit: 'Apples',       count: 5 },
    { fruit: 'Pears',        count: 3 },
    { fruit: 'Nectarines',   count: 4 },
    { fruit: 'Plums',        count: 2 },
    { fruit: 'Grapes',       count: 4 },
    { fruit: 'Strawberries', count: 6 },
  ];

  let highlightFruit = null;

  const drawChart = () => {
    const container = document.getElementById('bar-chart-inner');
    container.innerHTML = '';
    const plt = Bokeh.Plotting;
    const p = plt.figure({
      x_range: data.map(d => d.fruit),
      y_range: [0, 8],
      height: 300, width: 500,
      title: 'Fruit counts',
      toolbar_location: null,
      output_backend: 'svg',
    });

    p.vbar({
      x: data.map(d => d.fruit),
      top: data.map(d => d.count),
      bottom: 0,
      width: 0.8,
      color: data.map(d =>
        highlightFruit === '__all__' || d.fruit === highlightFruit ? '#1e3369' : '#aec7e8'
      ),
      line_color: '#1e3369',
    });

    plt.show(p, '#bar-chart-inner');
  };

  drawChart();

  ({ addDataNavigator } = await import('@data-navigator/bokeh-wrapper'));

  const initWrapper = (mode) => {
    wrapper?.destroy();
    // Reset highlight and redraw before creating the wrapper so keyboard
    // navigation elements are placed into a fresh chart container.
    highlightFruit = null;
    drawChart();
    wrapper = addDataNavigator({
      plotContainer: 'bar-plot',
      chatContainer: 'bar-chat',
      mode,
      data,
      type: 'bar',
      title: 'Fruit counts',
      xField: 'fruit',
      yField: 'count',
      compressSparseDivisions: true,
      onNavigate(node) {
        if (node.derivedNode && node.data?.fruit == null) {
          // Dimension root — no specific fruit focused; tint all bars.
          highlightFruit = '__all__';
        } else {
          highlightFruit = node.data?.fruit ?? null;
        }
        drawChart();
      },
      onExit() {
        highlightFruit = null;
        drawChart();
      },
    });
  };

  initWrapper('text');

  document.getElementById('bar-keyboard')?.addEventListener('change', e => {
    initWrapper(e.target.checked ? 'keyboard' : 'text');
  });
});

onUnmounted(() => wrapper?.destroy());
</script>

## Code

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';

const data = [
  { fruit: 'Apples',       count: 5 },
  { fruit: 'Pears',        count: 3 },
  { fruit: 'Nectarines',   count: 4 },
  { fruit: 'Plums',        count: 2 },
  { fruit: 'Grapes',       count: 4 },
  { fruit: 'Strawberries', count: 6 },
];

const wrapper = addDataNavigator({
  plotContainer: '#my-plot',
  data,
  type: 'bar',        // optional — auto-detected from data shape
  title: 'Fruit counts',
  xField: 'fruit',
  yField: 'count',
  compressSparseDivisions: true,
  onNavigate(node) {
    if (node.derivedNode && node.data?.fruit == null) {
      // Dimension root — no specific fruit yet; highlight the whole group.
      drawChart({ highlight: '__all__' });
    } else {
      drawChart({ highlight: node.data.fruit });
    }
  },
  onExit() {
    drawChart({ highlight: null });
  },
});
```

## What happens

1. The wrapper marks the Bokeh container `inert` so screen readers skip the canvas.
2. A text-chat interface appears below the chart. Toggle **Use keyboard navigation** to switch to arrow-key navigation instead.
3. Type `enter` to begin navigating, then `right` / `left` to move between fruits.
4. `onNavigate` fires at every level — including the dimension root — so the chart can show a focus indicator as soon as navigation starts.
5. Type `help` at any time to see available commands.

## Commands

| Command | Action |
|---------|--------|
| `enter` | Enter the navigation structure |
| `right` | Move to the next fruit |
| `left` | Move to the previous fruit |
| `move to <search>` | Jump to a fruit by name |
| `help` | List available commands |
