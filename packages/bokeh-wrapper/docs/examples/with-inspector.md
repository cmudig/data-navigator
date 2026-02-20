# Using the Inspector

Combine `@data-navigator/bokeh-wrapper` with [`@data-navigator/inspector`](https://dig.cmu.edu/data-navigator/inspector/) to visualise the navigation graph alongside your chart. The inspector helps you understand the structure the wrapper created, and shows your position as you navigate.

## Live example

<div style="display:flex; gap:2em; flex-wrap:wrap; align-items:flex-start;">
  <div>
    <h3>Bokeh Chart</h3>
    <div id="insp-plot" style="display:inline-block;"></div>
    <div id="insp-chat" style="max-width:400px; margin-top:1rem;"></div>
  </div>
  <div>
    <h3>Structure Inspector</h3>
    <div id="insp-graph" style="min-height:320px; min-width:320px;"></div>
  </div>
</div>

<script setup>
import { onMounted, onUnmounted } from 'vue';

let wrapper = null;
let inspector = null;

onMounted(async () => {
  const waitFor = (check, timeout = 5000) => new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => check() ? resolve() : Date.now() - start > timeout ? reject(new Error('Timeout')) : setTimeout(poll, 50);
    poll();
  });

  await waitFor(() => typeof Bokeh !== 'undefined' && Bokeh.Plotting);
  await waitFor(() => document.getElementById('insp-plot'));

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
    const container = document.getElementById('insp-plot');
    container.innerHTML = '';
    const plt = Bokeh.Plotting;
    const p = plt.figure({
      x_range: data.map(d => d.fruit),
      y_range: [0, 8],
      height: 260, width: 400,
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
    plt.show(p, '#insp-plot');
    document.getElementById('insp-plot')?.setAttribute('inert', 'true');
  };

  drawChart();

  const [{ addDataNavigator }, { Inspector, buildLabel }] = await Promise.all([
    import('@data-navigator/bokeh-wrapper'),
    import('@data-navigator/inspector'),
  ]);

  wrapper = addDataNavigator({
    plotContainer: 'insp-plot',
    chatContainer: 'insp-chat',
    data,
    type: 'bar',
    xField: 'fruit',
    yField: 'count',
    onNavigate(node) {
      highlightFruit = node.data?.fruit ?? null;
      drawChart();
      // Sync inspector focus
      const renderId = node.renderId ?? node.id;
      inspector?.highlight(renderId);
    },
    onExit() {
      highlightFruit = null;
      drawChart();
      inspector?.clear();
    },
  });

  // Create inspector from the wrapper's structure
  inspector = Inspector({
    structure: wrapper.structure,
    container: 'insp-graph',
    size: 300,
    colorBy: 'dimensionLevel',
    edgeExclusions: ['dn-exit'],
  });
});

onUnmounted(() => {
  wrapper?.destroy();
  inspector?.destroy();
});
</script>

## Code

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';
import { Inspector, buildLabel } from '@data-navigator/inspector';
import '@data-navigator/inspector/style.css';

const data = [
  { fruit: 'Apples', count: 5 },
  // ...
];

// Step 1: add data-navigator to the chart
const wrapper = addDataNavigator({
  plotContainer: '#my-plot',
  data,
  type: 'bar',
  xField: 'fruit',
  yField: 'count',
  onNavigate(node) {
    redrawChart({ highlight: node.data.fruit });
    // Step 3: sync inspector focus
    inspector.highlight(node.renderId ?? node.id);
  },
  onExit() {
    redrawChart({ highlight: null });
    inspector.clear();
  },
});

// Step 2: create the inspector from wrapper.structure
const inspector = Inspector({
  structure: wrapper.structure,   // ← use wrapper.structure directly
  container: 'inspector-container',
  size: 300,
  colorBy: 'dimensionLevel',
  edgeExclusions: ['dn-exit'],    // hide the exit edge for clarity
});
```

## Notes

- `wrapper.structure` is the raw data-navigator `Structure` object — pass it to any data-navigator tool.
- `edgeExclusions: ['dn-exit']` hides the internal exit edge so the inspector graph only shows navigable paths.
- `colorBy: 'dimensionLevel'` colours nodes by their depth in the hierarchy, making it easy to distinguish dimension nodes, division nodes, and leaf nodes.
