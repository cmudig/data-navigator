---
title: Spatial Plus
---

<script setup>
const charts = [
    { id: 'iris', label: 'Iris (Skeleton example)', load: () => import('./charts/plus-iris.js') },
    { id: 'cars', label: 'Cars by origin', load: () => import('./charts/plus-cars.js') }
];
</script>

# Spatial Plus

Spatial plus is [2D spatial](./spatial) navigation with one category added. Use it for a scatterplot colored by group.

Each data point belongs to three groups at once: an x range, a y range, and a category. That gives three ways to move from any point.

| Keys | Moves through               | Question it answers              |
| ---- | --------------------------- | -------------------------------- |
| ← →  | Every point, in x order     | "What is next along the x axis?" |
| ↓ ↑  | Every point, in y order     | "What is next along the y axis?" |
| [ ]  | Points in the same category | "What else is in this group?"    |

The iris chart is the pre-built scatterplot from the [Skeleton](https://dig.cmu.edu/data-navigator/skeleton/) app, exported in full. It uses the same rule names, keys, and settings an author made in Skeleton's editor.

## Shape

```
Root
├── Species             [ ]   W goes up here
│   ├── setosa
│   ├── versicolor
│   └── virginica
├── Sepal length        ← →   J goes up here
│   ├── 4.7 to 5.18
│   └── ...
└── Petal length        ↓ ↑   \ goes up here
    ├── 1 to 2
    └── ...
        (all three trees share the same 15 flowers)
```

The three top-level groups sit side by side. Left and Right move between them, and the last wraps to the first (`level1Options.behavior.extents: 'circular'`).

## Try it

<PatternDemo id="spatial-plus" :charts="charts" />

## How it is built

Three dimensions under one root. The category uses `childmostNavigation: 'within'`, so `[` and `]` step through one species at a time. The numbers use `extents: 'bridgedCousins'`, so the arrow keys keep going from one range into the next.

::: code-group

<<< @/patterns/charts/plus-iris.js#structure{js} [Iris (Skeleton example)]

<<< @/patterns/charts/plus-cars.js#structure{js} [Cars by origin]

:::

Things to notice in the Skeleton export:

- **Every rule is named and keyed by hand.** The top-level `navigationRules` lists all of them, so nothing is assigned automatically.
- **Rule names can be plain language.** `'drill out to species'` is a valid name. The text chat accepts it as a command, and it reads well in the help list.
- **Up and Down point the right way.** Ranges are stored low to high, so `up` uses `direction: 'target'` to move toward higher petal lengths.
- **`compressSparseDivisions: true`** is on for every dimension. It only takes effect if every group would hold one point, which keeps tiny datasets from having pointless levels.

## Labels

Scatterplot points name both numbers, since two bare numbers are easy to mix up. The category comes last: `Sepal 5.1, petal 1.4, setosa`. See [Text Labels](./labels) for an expert option that drops the names.

<<< @/patterns/charts/plus-iris.js#labels{js}

## Focus indicators

| Node               | Indicator                                                   |
| ------------------ | ----------------------------------------------------------- |
| Flower or car      | Circle on the dot                                           |
| Species or origin  | Convex hull around the group's dots (`convexHullOfCircles`) |
| x range            | Vertical band across the plot                               |
| y range            | Horizontal band across the plot                             |
| Species dimension  | The species names (iris), or the color legend (cars)        |
| x and y dimensions | The x axis and the y axis                                   |
| Root               | The whole plot                                              |

The hulls tell you something about the data. Iris species barely overlap, so their hulls are separate. Car origins overlap a lot, so their hulls pile on top of each other.

<<< @/patterns/charts/plus-iris.js#focus{js}
