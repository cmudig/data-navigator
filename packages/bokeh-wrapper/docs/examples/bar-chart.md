# Bar Chart

A classic vertical bar chart showing fruit counts, taken from the [Bokeh documentation](https://docs.bokeh.org/en/latest/docs/gallery.html). `addDataNavigator` is called after the chart renders with no manual structure configuration — the wrapper detects the bar chart pattern from the data and adds a text-chat interface automatically.

## Live example

<div id="bar-plot" style="display:inline-block;"></div>
<div id="bar-chat" style="max-width:500px; margin-top: 1rem;"></div>

<script setup>
import { onMounted, onUnmounted } from 'vue';

let wrapper = null;

onMounted(async () => {
  const waitFor = (check, timeout = 5000) => new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => check() ? resolve() : Date.now() - start > timeout ? reject(new Error('Timeout')) : setTimeout(poll, 50);
    poll();
  });

  await waitFor(() => typeof Bokeh !== 'undefined' && Bokeh.Plotting);
  await waitFor(() => document.getElementById('bar-plot'));

  // ── Bokeh chart ──────────────────────────────────────────────────────────────
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
    const container = document.getElementById('bar-plot');
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
      color: data.map(d => d.fruit === highlightFruit ? '#1e3369' : '#aec7e8'),
      line_color: '#1e3369',
    });

    plt.show(p, '#bar-plot');
    // Make Bokeh canvas inert — the wrapper also sets this, but doing it here
    // prevents a flash of accessible-but-unfocused content.
    document.getElementById('bar-plot')?.setAttribute('inert', 'true');
  };

  drawChart();

  // ── addDataNavigator ──────────────────────────────────────────────────────────
  const { addDataNavigator } = await import('@data-navigator/bokeh-wrapper');

  wrapper = addDataNavigator({
    plotContainer: 'bar-plot',
    chatContainer: 'bar-chat',
    data,
    type: 'bar',
    xField: 'fruit',
    yField: 'count',
    onNavigate(node) {
      highlightFruit = node.data?.fruit ?? null;
      drawChart();
    },
    onExit() {
      highlightFruit = null;
      drawChart();
    },
  });
});

onUnmounted(() => wrapper?.destroy());
</script>

## Code

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';
import 'data-navigator/text-chat.css';

const data = [
  { fruit: 'Apples',       count: 5 },
  { fruit: 'Pears',        count: 3 },
  { fruit: 'Nectarines',   count: 4 },
  { fruit: 'Plums',        count: 2 },
  { fruit: 'Grapes',       count: 4 },
  { fruit: 'Strawberries', count: 6 },
];

// Render your Bokeh chart first, then:
const wrapper = addDataNavigator({
  plotContainer: '#my-plot',
  data,
  type: 'bar',         // optional — auto-detected from data shape
  xField: 'fruit',
  yField: 'count',
  onNavigate(node) {
    // Redraw the chart with a highlight on the focused fruit
    drawChart({ highlight: node.data.fruit });
  },
  onExit() {
    drawChart({ highlight: null });
  },
});
```

## What happens

1. The wrapper sets the Bokeh container to `inert` so screen readers skip the canvas.
2. A text-chat interface appears below the chart.
3. Type `enter` to begin navigating, then `right` / `left` to move between fruits.
4. `onNavigate` fires on every move so the chart can redraw a visible focus indicator.
5. Type `help` at any time to see available commands.

## Commands

| Command | Action |
|---------|--------|
| `enter` | Enter the navigation structure |
| `right` | Move to the next fruit |
| `left` | Move to the previous fruit |
| `child` | Drill into a category group |
| `parent` | Go back up |
| `move to <search>` | Jump to a fruit by name |
| `help` | List available commands |
