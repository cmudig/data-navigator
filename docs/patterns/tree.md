---
title: Tree
---

<script setup>
const charts = [
    { id: 'lines', label: 'Multi-line', load: () => import('./charts/tree-lines.js') },
    { id: 'pack', label: 'Circle packing', load: () => import('./charts/tree-pack.js') },
    { id: 'diagram', label: 'Tree diagram', load: () => import('./charts/tree-diagram.js') }
];
</script>

# Tree

A tree groups data points under parents, and parents under their own parents. Each node has exactly one parent.

Use it when the data has one grouping (lines in a multi-line chart) or when the data is a hierarchy itself (a circle packing, a treemap, an org chart).

## Shape

```
Cities                         flare
├── New York                   ├── analytics
│   ├── 0 degrees, Jan         │   ├── cluster
│   ├── 2 degrees, Feb         │   │   ├── 3,938 bytes, AgglomerativeCluster
│   └── ...                    │   │   └── ...
├── London                     │   └── graph
└── Sydney                     ├── animate
                               └── display
```

- Enter goes down a level. Backspace goes back up.
- Left and Right move between siblings, nodes with the same parent.
- A one-grouping tree, like the multi-line chart, has three levels. A hierarchy can be as deep as the data.

## Try it

<PatternDemo id="tree" :charts="charts" />

## How it is built

### One grouping: the dimensions API

The multi-line chart is one categorical dimension, `city`. Each city becomes a division, and each division holds its points. `childmostNavigation: 'within'` keeps Left and Right on one line.

<<< @/patterns/charts/tree-lines.js#structure{js}

### Any depth: the `hierarchy` option

The dimensions API stops at three levels. For deeper data, pass rows that each name their parent, the same shape `d3.stratify` reads. Every row becomes a node, including the packages, so you can stop on `analytics` and hear its total.

::: code-group

<<< @/patterns/charts/tree-pack.js#structure{js} [Circle packing]

<<< @/patterns/charts/tree-diagram.js#structure{js} [Tree diagram]

:::

| Option            | What it does                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| `parentKey`       | The field that names each row's parent. The row with an empty parent is the root.                               |
| `sortFunction`    | Orders siblings. The circle packing sorts biggest first, like the layout.                                       |
| `levelNavigation` | `'within'` (default): sibling keys stay inside one parent. `'across'`: they reach every node at the same depth. |
| `extents`         | `'circular'` (default) wraps around. `'terminal'` stops at the ends.                                            |
| `navigationRules` | Key names for siblings and for parent and child.                                                                |

### Two choices worth copying

**Level-wide navigation.** The tree diagram uses `levelNavigation: 'across'`. From `MergeEdge`, the last class in `cluster`, Down goes straight to `BetweennessCentrality` in `graph`. You can read every class without going up and down the tree. Use it when people want to compare all nodes at one depth.

**Keys that follow the layout.** The tree diagram grows to the right, so Left goes to the parent and Right goes to the first child. Siblings are stacked, so Up and Down move between them. The circle packing has no direction, so it keeps Enter and Backspace.

## Labels

A leaf leads with its value: `3,938 bytes, AgglomerativeCluster`. A parent names itself and sums up what is inside: `cluster. 4 items, 15,207 bytes.`

<<< @/patterns/charts/tree-pack.js#labels{js}

## Focus indicators

| Chart          | Data point                  | Parent                            |
| -------------- | --------------------------- | --------------------------------- |
| Multi-line     | Circle on the point         | Band along the line               |
| Circle packing | Circle around the circle    | Circle around the parent's circle |
| Tree diagram   | Box around the dot and name | Hull around the whole branch      |

The tree diagram's hull uses `convexHullOfCircles` over every dot in the branch:

<<< @/patterns/charts/tree-diagram.js#focus{js}

## Credits

The circle packing and tree diagram follow the D3 gallery's [circle packing](https://observablehq.com/@d3/pack) and [tidy tree](https://observablehq.com/@d3/tree) examples. The data is a trimmed part of the flare class hierarchy those examples use.
