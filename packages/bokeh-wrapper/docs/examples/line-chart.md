# Line Chart (multiple series)

A multi-line chart showing monthly average temperatures for three cities. The wrapper uses `type: 'multiline'` with `groupField: 'city'` to create a two-level structure: navigate between cities at the top level, then drill in to move through monthly data points.

## Live example

<div id="line-plot" style="display:inline-block;"><div id="line-chart-inner"></div></div>

<label class="dn-nav-toggle">
  <input type="checkbox" id="line-keyboard">
  Use keyboard navigation
</label>

<div v-show="keyboardMode" class="dn-keyboard-controls">

| Key                          | Action                                                      |
| ---------------------------- | ----------------------------------------------------------- |
| Enter navigation area button | Start keyboard navigation                                   |
| <kbd>←</kbd> <kbd>→</kbd>    | Navigate between cities (or months when drilled in)         |
| <kbd>Enter</kbd>             | Drill into cities or into monthly data for the focused city |
| <kbd>Backspace</kbd>         | Go back to city level                                       |
| <kbd>Escape</kbd>            | Exit navigation                                             |

</div>

<div id="line-chat" style="max-width:500px;"></div>

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
  await waitFor(() => document.getElementById('line-plot'));

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
    const container = document.getElementById('line-chart-inner');
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
      const isFocused = focusedCity === '__all__' || city === focusedCity;
      const dimmed = focusedCity != null && focusedCity !== '__all__' && !isFocused;
      p.line(months, temps, {
        line_color: colors[city],
        line_width: (isFocused && focusedMonth == null) ? 3 : 1.5,
        line_alpha: dimmed ? 0.3 : 1.0,
        legend_label: city,
      });
      if (isFocused && focusedCity !== '__all__' && focusedMonth != null) {
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
    plt.show(p, '#line-chart-inner');
  };

  drawChart();

  ({ addDataNavigator } = await import('@data-navigator/bokeh-wrapper'));

  const initWrapper = (mode) => {
    wrapper?.destroy();
    focusedCity = null;
    focusedMonth = null;
    drawChart();
    wrapper = addDataNavigator({
      plotContainer: 'line-plot',
      chatContainer: 'line-chat',
      mode,
      data,
      type: 'multiline',
      xField: 'month',
      yField: 'temp_c',
      groupField: 'city',
      commandLabels: {
        left:   'Move to previous city',
        right:  'Move to next city',
        child:  'Drill into monthly data for this city',
        parent: 'Go back to cities',
      },
      onNavigate(node) {
        if (node.derivedNode) {
          const city = node.data?.city ?? node.data?.[node.derivedNode] ?? null;
          if (city) {
            // Division node — a specific city is in focus.
            focusedCity = city;
          } else {
            // Dimension root — highlight all series to show we've entered.
            focusedCity = '__all__';
          }
          focusedMonth = null;
        } else {
          focusedCity = node.data?.city ?? null;
          focusedMonth = node.data?.month ?? null;
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

  document.getElementById('line-keyboard')?.addEventListener('change', e => {
    keyboardMode.value = e.target.checked;
    initWrapper(e.target.checked ? 'keyboard' : 'text');
  });
});

onUnmounted(() => wrapper?.destroy());
</script>

## Structure

For `type: 'multiline'` the navigation hierarchy is:

```
city dimension
  └─ New York division
       ├─ Jan: 0°C
       ├─ Feb: 2°C
       └─ ... (12 months)
  └─ London division
       └─ ...
  └─ Sydney division
       └─ ...
```

- `left` / `right` navigates between city groups at the top level
- `child` drills into the months for the current city
- `left` / `right` (inside a city) navigates between months
- `parent` returns to the city level

## Full code

Create three files in the same directory and serve them with a local server (e.g. `npx serve .` or `python -m http.server`). Bokeh is loaded from CDN; the wrapper is loaded via import map. The **wrapper** tab is the integration layer; **chart** is the Bokeh rendering code.

::: code-group

```js [wrapper.js]
import { addDataNavigator } from '@data-navigator/bokeh-wrapper';
import { data, drawChart } from './chart.js';

let wrapper = null;
let focusedCity = null;
let focusedMonth = null;

function initWrapper(mode) {
    wrapper?.destroy();
    focusedCity = null;
    focusedMonth = null;
    drawChart({ focusedCity, focusedMonth });
    wrapper = addDataNavigator({
        plotContainer: 'line-plot',
        chatContainer: 'line-chat',
        mode,
        data,
        type: 'multiline',
        xField: 'month',
        yField: 'temp_c',
        groupField: 'city',
        commandLabels: {
            left: 'Move to previous city',
            right: 'Move to next city',
            child: 'Drill into monthly data for this city',
            parent: 'Go back to cities'
        },
        onNavigate(node) {
            if (node.derivedNode) {
                const city = node.data?.city ?? node.data?.[node.derivedNode] ?? null;
                focusedCity = city ?? '__all__';
                focusedMonth = null;
            } else {
                focusedCity = node.data?.city ?? null;
                focusedMonth = node.data?.month ?? null;
            }
            drawChart({ focusedCity, focusedMonth });
        },
        onExit() {
            focusedCity = null;
            focusedMonth = null;
            drawChart({ focusedCity, focusedMonth });
        }
    });
}

initWrapper('text');

document.getElementById('line-keyboard')?.addEventListener('change', e => {
    initWrapper(e.target.checked ? 'keyboard' : 'text');
});
```

```js [chart.js]
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const cityData = {
    'New York': [0, 2, 7, 13, 19, 24, 27, 26, 22, 15, 9, 3],
    London: [5, 5, 7, 10, 14, 17, 19, 18, 15, 11, 7, 5],
    Sydney: [22, 22, 20, 17, 14, 11, 10, 11, 13, 16, 19, 21]
};

const colors = { 'New York': '#e41a1c', London: '#377eb8', Sydney: '#ff7f00' };

// Flatten for data-navigator: one row per (city, month) combination.
export const data = [];
for (const [city, temps] of Object.entries(cityData)) {
    months.forEach((month, i) => {
        data.push({ city, month, month_index: i, temp_c: temps[i] });
    });
}

export function drawChart({ focusedCity = null, focusedMonth = null } = {}) {
    const container = document.getElementById('line-chart-inner');
    container.innerHTML = '';
    const plt = Bokeh.Plotting;
    const p = plt.figure({
        height: 300,
        width: 550,
        title: 'Monthly average temperatures',
        x_range: months,
        y_axis_label: '°C',
        toolbar_location: null,
        output_backend: 'svg'
    });

    for (const [city, temps] of Object.entries(cityData)) {
        const isFocused = focusedCity === '__all__' || city === focusedCity;
        const dimmed = focusedCity != null && focusedCity !== '__all__' && !isFocused;
        p.line(months, temps, {
            line_color: colors[city],
            line_width: isFocused && focusedMonth == null ? 3 : 1.5,
            line_alpha: dimmed ? 0.3 : 1.0,
            legend_label: city
        });
        if (isFocused && focusedCity !== '__all__' && focusedMonth != null) {
            const idx = months.indexOf(focusedMonth);
            if (idx >= 0) {
                p.scatter({
                    x: [focusedMonth],
                    y: [temps[idx]],
                    marker: 'circle',
                    size: 12,
                    fill_color: colors[city],
                    line_color: '#000',
                    line_width: 2
                });
            }
        }
    }

    p.legend.location = 'top_left';
    plt.show(p, '#line-chart-inner');
}
```

```html [index.html]
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Line Chart — Data Navigator Bokeh Wrapper</title>
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
        <div id="line-plot" style="display:inline-block;">
            <div id="line-chart-inner"></div>
        </div>
        <label>
            <input type="checkbox" id="line-keyboard" />
            Use keyboard navigation
        </label>
        <div id="line-chat" style="max-width:500px;"></div>
        <script type="module" src="./wrapper.js"></script>
    </body>
</html>
```

:::
