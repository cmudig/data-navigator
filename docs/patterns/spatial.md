---
title: 2D Spatial
---

<script setup>
const charts = [
    { id: 'scatter', label: 'Scatter (x and y ranges)', load: () => import('./charts/spatial-scatter.js') },
    { id: 'heatmap', label: 'Heatmap (nested grid)', load: () => import('./charts/spatial-heatmap.js') },
    { id: 'nested', label: 'Scatter (nested grid)', load: () => import('./charts/spatial-nested.js') }
];
</script>

# 2D Spatial

2D spatial navigation cuts the plot into pieces by position. Use it when both axes are numbers: scatterplots, heatmaps, and maps.

There are two ways to cut the space, and this page shows both.

1. **Ranges on each axis.** The dimensions API bins x into ranges and y into ranges. A point belongs to one x range and one y range. This is a [dual tree](./dual-tree) whose groups are numbers.
2. **A nested grid.** The `spatialGrid` option cuts the plot into 4 regions, then each region into 4 more, and so on. A point belongs to one cell at each zoom level.

## Shape

```
Ranges on each axis                 Nested grid (levels: [2, 4])
Chart                               Grid
├── Horsepower                      ├── top left        (2x2)
│   ├── 46 to 92                    │   ├── 4 cells     (4x4)
│   │   └── cars...                 │   │   └── cars or cells
│   └── ...                         │   └── ...
└── MPG                             ├── top right
    ├── 11 to 20                    ├── bottom left
    └── ...                         └── bottom right
```

## Navigate across a whole zoom level

In a nested grid, the arrow keys move to the next box **of the same size**, even when it sits in a different parent. From the top-right small box of the top-left region, Right goes to the top-left small box of the top-right region. You never have to zoom out to cross a border.

This is `levelNavigation: 'across'`, the default. It is the grid version of `extents: 'bridgedCousins'` in the dimensions API, where Left and Right at a data point walk every point in x order, across all ranges.

Use `'within'` instead if the regions mean something on their own, like countries on a map, and crossing them would be confusing.

## Try it

<PatternDemo id="spatial" :charts="charts" />

## How it is built

::: code-group

<<< @/patterns/charts/spatial-scatter.js#structure{js} [Scatter (ranges)]

<<< @/patterns/charts/spatial-heatmap.js#structure{js} [Heatmap (nested grid)]

<<< @/patterns/charts/spatial-nested.js#structure{js} [Scatter (nested grid)]

:::

### Ranges on each axis

| Option                           | What it does                                                               |
| -------------------------------- | -------------------------------------------------------------------------- |
| `type: 'numerical'`              | Bins the field by value.                                                   |
| `createNumericalSubdivisions: 4` | Four equal ranges per axis.                                                |
| `extents: 'bridgedCousins'`      | At a point, sibling keys continue into the next range instead of stopping. |
| `childmostNavigation: 'within'`  | Points are ordered by value inside each range.                             |
| `navigationRules` (top level)    | Ranges run low to high, so `up` points at the target to mean "higher MPG". |

### Nested grid

| Option               | What it does                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `xKey`, `yKey`       | The two numerical fields.                                                                                |
| `xExtent`, `yExtent` | The full range to split. Defaults to the data's min and max.                                             |
| `levels`             | Cells per axis at each zoom level. `[2, 4]` makes a 2x2 grid, then a 4x4 grid.                           |
| `leaves`             | `'points'`: rows sit inside the smallest cells (scatterplots). `'cells'`: each row is a cell (heatmaps). |
| `levelNavigation`    | `'across'` (default): arrows reach every box at a zoom level. `'within'`: arrows stay in the parent.     |
| `skipEmpty`          | `true` (default): empty boxes are left out, and arrows jump over the gap.                                |
| `extents`            | `'terminal'` (default) stops at the plot edge. `'circular'` wraps around.                                |

Up means higher values in a nested grid by default, so you do not need to set the rules yourself.

## Labels

A data point names both values. Keys help here, since two bare numbers are easy to mix up: `Horsepower 130, MPG 18, chevrolet chevelle malibu`. Regions lead with their count and give both ranges: `14 cars, horsepower 40 to 90, MPG 30 to 40. Region.`

<<< @/patterns/charts/spatial-heatmap.js#labels{js}

## Focus indicators

| Chart                 | Data point          | Groups                                                          |
| --------------------- | ------------------- | --------------------------------------------------------------- |
| Scatter (ranges)      | Circle on the dot   | A vertical band for an x range, a horizontal band for a y range |
| Heatmap (nested grid) | Box around the cell | A box around each region, smaller at each zoom level            |
| Scatter (nested grid) | Circle on the dot   | A box around each region                                        |

The bands make the difference between the two approaches easy to see. A range covers a whole strip of the chart. A grid region covers one patch.

<<< @/patterns/charts/spatial-nested.js#focus{js}

## Need a category too?

Add it as a third dimension. See [spatial plus](./spatial-plus).
