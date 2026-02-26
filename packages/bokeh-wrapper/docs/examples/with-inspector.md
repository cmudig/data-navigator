# Using the Inspector

Combine `@data-navigator/bokeh-wrapper` with [`@data-navigator/inspector`](https://dig.cmu.edu/data-navigator/inspector/) to visualise the navigation graph alongside your chart. The inspector helps you understand the structure the wrapper created, and shows your position as you navigate.

Pay close attention to the structure in this example and compare it to the first [bar chart example](/examples/bar-chart) in our docs for the Bokeh wrapper. What looks incorrect about this structure below? Try navigating to see what is off, here:

## Live example

<div style="display:flex;flex-wrap:wrap; align-items:flex-start;">
  <div>
    <h3>Bokeh Chart</h3>
    <div id="insp-plot"><div id="insp-chart-inner"></div></div>
    <label class="dn-nav-toggle">
      <input type="checkbox" id="insp-keyboard">
      Use keyboard navigation
    </label>
    <div id="insp-chat" style="max-width:400px;"></div>
  </div>
  <div>
    <h3>Structure Inspector</h3>
    <div id="insp-graph" style="min-height:320px; min-width:320px;"></div>
  </div>
</div>

## Live example (fixed)

The previous example had divisions under the main categorical dimension that each had only a single child. See how the structure looks like a flower? When you navigate in, you press enter to go to what you might assume is the child level. But reading the labels or watching the inspector reveals that there is a child level that is one further than this! Pressing enter again leads to the actual data, but now you can't move left or right to other data points.

This happens when using a nominative data type where each category happens to be a unique instance. So rather than "Apples" having 3 different instances, "Apples" are unique and only appear once, like an ID or name. This is a common way to organize categorical data as a bar chart. So, to make this navigation experience better (so that users can treat each individual entity more like a sibling in a list than children of other single-child parents), we use the property `compressSparseDivisions: true` here, instead.

In this example below, we have improved the structure (notice how it *looks* different than the one above). This type of incorrect structure is very hard to discover simply by navigating around, one element at a time. This is why the visual inspector is so useful as a development, design, and user experience testing tool.

<div style="display:flex;flex-wrap:wrap; align-items:flex-start;">
  <div>
    <h3>Bokeh Chart</h3>
    <div id="insp-plot-fixed"><div id="insp-chart-inner-fixed"></div></div>
    <label class="dn-nav-toggle">
      <input type="checkbox" id="insp-keyboard-fixed">
      Use keyboard navigation
    </label>
    <div id="insp-chat-fixed" style="max-width:400px;"></div>
  </div>
  <div>
    <h3>Structure Inspector</h3>
    <div id="insp-graph-fixed" style="min-height:320px; min-width:320px;"></div>
  </div>
</div>

<script setup>
import { onMounted, onUnmounted } from 'vue';

let wrapper = null;
let inspector = null;
let wrapperFixed = null;
let inspectorFixed = null;
let addDataNavigator = null;

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
  let highlightFruitFixed = null;

  const drawChart = (_second) => {
    const second = _second || '';
    const container = document.getElementById('insp-chart-inner'+second);
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
      color: data.map(d =>
        !_second ? (highlightFruit === '__all__' || d.fruit === highlightFruit ? '#1e3369' : '#aec7e8') : highlightFruitFixed === '__all__' || d.fruit === highlightFruitFixed ? '#1e3369' : '#aec7e8'
      ),
      line_color: '#1e3369',
    });
    plt.show(p, '#insp-chart-inner'+second);
  };

  drawChart();
  drawChart('-fixed');

  const [{ addDataNavigator: _addDN }, { Inspector }] = await Promise.all([
    import('@data-navigator/bokeh-wrapper'),
    import('@data-navigator/inspector'),
  ]);
  addDataNavigator = _addDN;

  const initWrapper = (mode) => {
    wrapper?.destroy();
    highlightFruit = null;
    drawChart();

    wrapper = addDataNavigator({
      plotContainer: 'insp-plot',
      chatContainer: 'insp-chat',
      mode,
      data,
      type: 'bar',
      xField: 'fruit',
      yField: 'count',
      onNavigate(node) {
        const renderId = node.renderId ?? node.id;
        inspector?.highlight(renderId);
        if (node.derivedNode && node.data?.fruit == null) {
          highlightFruit = '__all__';
        } else {
          highlightFruit = node.data?.fruit ?? null;
        }
        drawChart();
      },
      onExit() {
        inspector?.clear();
        highlightFruit = null;
        drawChart();
      },
    });

    // Create inspector once from the first wrapper's structure.
    if (!inspector) {
      inspector = Inspector({
        structure: wrapper.structure,
        container: 'insp-graph',
        size: 300,
        colorBy: 'dimensionLevel',
        edgeExclusions: ['dn-exit'],
      });
    }
  };

  const initWrapperFixed = (mode) => {
    wrapperFixed?.destroy();
    highlightFruitFixed = null;
    drawChart('-fixed');

    wrapperFixed = addDataNavigator({
      plotContainer: 'insp-plot-fixed',
      chatContainer: 'insp-chat-fixed',
      mode,
      data,
      type: 'bar',
      xField: 'fruit',
      yField: 'count',
      compressSparseDivisions: true,
      onNavigate(node) {
        const renderId = node.renderId ?? node.id;
        inspectorFixed?.highlight(renderId);
        if (node.derivedNode && node.data?.fruit == null) {
          highlightFruitFixed = '__all__';
        } else {
          highlightFruitFixed = node.data?.fruit ?? null;
        }
        drawChart('-fixed');
      },
      onExit() {
        inspectorFixed?.clear();
        highlightFruitFixed = null;
        drawChart('-fixed');
      },
    });

    // Create inspector once from the second wrapper's structure.
    if (!inspectorFixed) {
      inspectorFixed = Inspector({
        structure: wrapperFixed.structure,
        container: 'insp-graph-fixed',
        size: 300,
        colorBy: 'dimensionLevel',
        edgeExclusions: ['dn-exit'],
      });
    }
  };

  initWrapper('text');
  initWrapperFixed('text');

  document.getElementById('insp-keyboard')?.addEventListener('change', e => {
    initWrapper(e.target.checked ? 'keyboard' : 'text');
  });
  document.getElementById('insp-keyboard-fixed')?.addEventListener('change', e => {
    console.log("swappin")
    initWrapperFixed(e.target.checked ? 'keyboard' : 'text');
  });
});

onUnmounted(() => {
  wrapper?.destroy();
  inspector?.destroy();
  wrapperFixed?.destroy();
  inspectorFixed?.destroy();
});
</script>


## Code

```js
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';
import { Inspector } from '@data-navigator/inspector';
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
  compressSparseDivisions: true, // this is the fix we want for this chart!
  onNavigate(node) {
    redrawChart({ highlight: node.data?.fruit ?? '__all__' });
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
- Call `inspector.highlight(node.renderId ?? node.id)` in `onNavigate` to keep the inspector in sync with both text-chat and keyboard navigation.
