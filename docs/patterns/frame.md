---
title: Basic Frame
---

<script setup>
const charts = [
    { id: 'bar', label: 'Bar (list inside)', load: () => import('./charts/frame-bar.js') },
    { id: 'lines', label: 'Multi-line (tree inside)', load: () => import('./charts/frame-lines.js') },
    { id: 'stacked', label: 'Stacked bar (dual tree inside)', load: () => import('./charts/frame-stacked.js') },
    { id: 'bubble', label: 'Bubble (grid inside)', load: () => import('./charts/frame-bubble.js') }
];
</script>

# Basic Frame

A chart drawn on a `<canvas>` is one image to a screen reader. Its title, axis names, and legend are pixels, so nobody can read them. The basic frame gives each of those parts a node, in the order a sighted reader takes them in, before the data.

The frame wraps any other pattern. The last item holds the data, and the data can be a [list](./list), a [tree](./tree), a [dual tree](./dual-tree), or a [2D grid](./spatial).

## Shape

```
Chart (root)
├── Title
├── Subtitle          (if there is one)
├── Y axis
├── X axis
├── Legend or labels (one per legend, or one for direct labels)
└── Data              (the only node with children)
    └── list, tree, dual tree, or grid
```

- Enter on the root goes to the title. Left and Right move through the frame. The last item wraps back to the first.
- Every frame item except Data is descriptive only. Enter does nothing there.
- Enter on Data goes into the data, using whatever pattern is inside.
- Backspace from anywhere in the frame goes back to the root.

## Try it

The bubble chart has two legends, one for color and one for size. Each gets its own node. The stacked bar and line charts name their series with direct labels instead, so the labels get one node.

<PatternDemo id="frame" :charts="charts" />

## How it is built

The `frame` option adds the root and the frame items around whatever else you build.

::: code-group

<<< @/patterns/charts/frame-bar.js#structure{js} [Bar]

<<< @/patterns/charts/frame-lines.js#structure{js} [Multi-line]

<<< @/patterns/charts/frame-stacked.js#structure{js} [Stacked bar]

<<< @/patterns/charts/frame-bubble.js#structure{js} [Bubble]

:::

| Option             | What it does                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`             | The top node. Give it the chart's alt text as its label.                                                                                                                      |
| `elements`         | The descriptive items, in reading order. They never have children.                                                                                                            |
| `data`             | Optional. The last item. With two or more dimensions, it becomes their shared parent. Leave it out when the data already has one top node, like a single dimension or a grid. |
| `behavior.extents` | `'circular'` (default) or `'terminal'`.                                                                                                                                       |
| `navigationRules`  | Sibling and parent rule names. Defaults: Left and Right, Enter and Backspace.                                                                                                 |

After building, `structure.frame` holds `{ rootId, elementIds, dataId }`. The text chat starts at `rootId` by default.

## Labels

Frame items say what they are, then what they say: `Title: Fruit in the basket.`, `Y axis: Count, 0 to 7.`, `Legend, size: Weight, 2,000 to 5,000 pounds.` Data says how much is inside: `Data: 6 bars.`

## Focus indicators

| Node            | Indicator                                        |
| --------------- | ------------------------------------------------ |
| Root            | The whole chart                                  |
| Title, subtitle | A box around the text                            |
| Y axis, x axis  | A box around the axis line, ticks, and axis name |
| Legend          | A box around that legend                         |
| Direct labels   | A box around all of the labels                   |
| Data            | The plot area, or the bars                       |

These boxes come from the canvas itself. The drawing helpers return the bounding box of every piece of text they draw, so the indicator fits what is on screen.

<<< @/patterns/charts/frame-bubble.js#focus{js}
