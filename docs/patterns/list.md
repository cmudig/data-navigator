---
title: List
---

<script setup>
const charts = [
    { id: 'bar', label: 'Vertical bar', load: () => import('./charts/list-bar.js') },
    { id: 'hbar', label: 'Horizontal bar', load: () => import('./charts/list-hbar.js') },
    { id: 'pie', label: 'Pie', load: () => import('./charts/list-pie.js') },
    { id: 'line', label: 'Single line', load: () => import('./charts/list-line.js') }
];
</script>

# List

The list is the simplest pattern. One parent node holds every data point.

Use it for small charts with one dimension and only a few marks: a bar chart, a pie chart, or a chart with a single line.

## Shape

```
Fruit                  (the one parent node)
├── 5, Apples
├── 3, Pears
├── 4, Nectarines
├── 2, Plums
├── 4, Grapes
└── 6, Strawberries
```

- There is one node above the data. There is no extra root and no group level in between.
- Moving past the last item loops back to the first (`extents: 'circular'`).
- The chart's orientation picks the arrow keys. Bars laid out left to right use Left and Right. Bars stacked top to bottom use Up and Down.

## Try it

Press **Enter navigation area** under the chart, or type `enter` in the text chat. Then use the keys in the table.

<PatternDemo id="list" :charts="charts" />

## How it is built

One categorical dimension makes the parent node and one division per value. Since every division holds a single data point, `compressSparseDivisions: true` removes the division level. The parent node then leads straight to the data points.

::: code-group

<<< @/patterns/charts/list-bar.js#structure{js} [Vertical bar]

<<< @/patterns/charts/list-hbar.js#structure{js} [Horizontal bar]

<<< @/patterns/charts/list-pie.js#structure{js} [Pie]

<<< @/patterns/charts/list-line.js#structure{js} [Single line]

:::

The only real difference is `sibling_sibling`. The horizontal bar chart uses `['up', 'down']` because its bars run top to bottom.

## Labels

Lead with the number, then name the thing: `5, Apples`. The parent node says what the group is and how many items it holds. See [Text Labels](./labels) for more.

::: code-group

<<< @/patterns/charts/list-bar.js#labels{js} [Vertical bar]

<<< @/patterns/charts/list-line.js#labels{js} [Single line]

:::

## Focus indicators

Each node gets a `spatialProperties.path`, drawn over the canvas when the node has focus. The shape follows the mark.

| Chart          | Data point          | Parent node                |
| -------------- | ------------------- | -------------------------- |
| Vertical bar   | Box around the bar  | Box around all bars        |
| Horizontal bar | Box around the bar  | Box around all bars        |
| Pie            | Outline of the arc  | Circle around the pie      |
| Single line    | Circle on the point | Band that follows the line |

::: code-group

<<< @/patterns/charts/list-pie.js#focus{js} [Pie]

<<< @/patterns/charts/list-line.js#focus{js} [Single line]

:::

Keyboard and text chat share one position, so there is only ever one outline on the chart.

## Source

- Chart modules: [list-bar.js](https://github.com/cmudig/data-navigator/blob/main/docs/patterns/charts/list-bar.js), [list-hbar.js](https://github.com/cmudig/data-navigator/blob/main/docs/patterns/charts/list-hbar.js), [list-pie.js](https://github.com/cmudig/data-navigator/blob/main/docs/patterns/charts/list-pie.js), [list-line.js](https://github.com/cmudig/data-navigator/blob/main/docs/patterns/charts/list-line.js)
- Shared wiring for keyboard, text chat, and the inspector: [mount.js](https://github.com/cmudig/data-navigator/blob/main/docs/patterns/shared/mount.js)
