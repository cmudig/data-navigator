---
title: Dual Tree
---

<script setup>
const charts = [
    { id: 'stacked', label: 'Stacked bar', load: () => import('./charts/dual-stacked.js') },
    { id: 'clustered', label: 'Clustered bar', load: () => import('./charts/dual-clustered.js') },
    { id: 'lines', label: 'Multi-line', load: () => import('./charts/dual-lines.js') }
];
</script>

# Dual Tree

The dual tree is the most flexible pattern. It fits any chart where each data point belongs to two categories at once: a stacked bar (year and browser), a clustered bar, or a line chart with a discrete x axis (month and city).

It is the structure at the heart of the [Data Navigator paper](https://www.frank.computer/data-navigator/) (Elavsky, Nadolskis, and Moritz, IEEE VIS 2023). The [Skeleton](https://dig.cmu.edu/data-navigator/skeleton/) editor shows it as its schema view.

## The idea: two trees, one set of leaves

A plain tree gives each data point one parent. That forces a choice. Do you group the stacked bar by year, or by browser? Either way, one question becomes hard to answer.

The dual tree refuses to choose. It builds both trees over the **same** data points:

```
                       Chart
               ┌─────────┴─────────┐
             Year               Browser          (dimensions)
        ┌─────┼─────┐       ┌────┼────┬────┐
      2015  2016  2017   Chrome Firefox ...      (divisions)
        │     │     │       │    │
        └─────┴──┬──┴───────┴────┘
         62%, Chrome, 2015   12%, Firefox, 2015 ...   (shared data points)
```

Every data point has two parents: its year and its browser. The inspector below the chart shows this as a grid. Each column is a year, each row is a browser, and every dot sits where its two parents cross.

## Why it works

At a data point, the arrow keys answer two different questions.

- **Left and Right** answer "how does this browser change over time?" They keep the browser and change the year.
- **Up and Down** answer "how does this year break down?" They keep the year and change the browser.

This comes from `childmostNavigation: 'across'`. At the data point level, the sibling keys of each dimension jump to the matching point in the **next division** instead of the next point in the same division. Left and Right cross the year divisions. Up and Down cross the browser divisions.

Getting out is just as direct. **W** goes up to the point's year. **J** goes up to its browser. So you can ask "what about all of 2016?" and "what about Safari overall?" from the same spot.

## Walk through it

Using the stacked bar chart:

| You are on         | You press | You land on        | Why                                |
| ------------------ | --------- | ------------------ | ---------------------------------- |
| Chart              | Enter     | Year               | First dimension                    |
| Year               | Enter     | 2015               | First year                         |
| 2015               | Enter     | 62%, Chrome, 2015  | First point in 2015                |
| 62%, Chrome, 2015  | →         | 63%, Chrome, 2016  | Same browser, next year            |
| 63%, Chrome, 2016  | ↑         | 12%, Firefox, 2016 | Same year, the browser above       |
| 12%, Firefox, 2016 | J         | Firefox            | Up to the browser group            |
| Firefox            | ↓         | Chrome             | Next browser group, down the stack |
| Chrome             | J         | Browser            | Up to the dimension                |

Try the same path with the keyboard or the text chat. In chat, type `enter`, `drill in`, `drill in`, `drill in`, `right`, `up`, `to-browser`.

<PatternDemo id="dual-tree" :charts="charts" />

## How it is built

Two categorical dimensions, both with `childmostNavigation: 'across'`. The `addLevel0` node is the root that holds them.

::: code-group

<<< @/patterns/charts/dual-stacked.js#structure{js} [Stacked bar]

<<< @/patterns/charts/dual-clustered.js#structure{js} [Clustered bar]

<<< @/patterns/charts/dual-lines.js#structure{js} [Multi-line]

:::

The three specs are almost the same. Only the keys change to fit the layout.

| Option                          | What it does                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `addLevel0`                     | Adds the root above both dimensions.                                                                                              |
| `childmostNavigation: 'across'` | Sibling keys at a data point move to the matching point in the next division.                                                     |
| `extents: 'circular'`           | The last year wraps to the first, and so on.                                                                                      |
| `sibling_sibling`               | The key pair for one dimension. Each dimension needs its own pair.                                                                |
| `parent_child`                  | The first name moves up to the parent. Give each dimension its own name (`to-year`, `to-browser`) so both parents stay reachable. |
| `divisionNodeIds`               | Readable ids like `year-2015`. Helpful in the inspector and in your code.                                                         |

### Match keys to the layout

The tree is the same in all three charts. The keys follow what is next to what on screen.

- **Stacked bar.** Browsers stack vertically, so Up and Down move between them. A `sortFunction` orders the browser divisions top to bottom, so Down really moves down.
- **Clustered bar.** Neighboring bars are browsers, so Left and Right move between them. Years are far apart, so they get `[` and `]`.
- **Multi-line.** Months run left to right. Lines cross each other, so Up and Down follow a fixed city order.

### Matching data points

`'across'` matches points by their position in each division. That works when every division lists its points in the same order, as these datasets do. If your data has gaps, pass a `childmostMatching` function in `behavior` to choose the match yourself.

## Labels

Lead with the value, then both categories: `62%, Chrome, 2015`. A division names itself and summarizes its children: `2015. 5 browsers. Chrome leads with 62%.`

<<< @/patterns/charts/dual-stacked.js#labels{js}

## Focus indicators

| Node           | Stacked bar                                        | Clustered bar                                           | Multi-line                                       |
| -------------- | -------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| Data point     | Box around the segment                             | Box around the bar                                      | Circle on the point                              |
| Year / month   | Box around the column                              | Box around the cluster                                  | Box around the month's points                    |
| Browser / city | Outline of each segment                            | Outline of each bar                                     | Band along the line                              |
| Dimension      | Year: plot and x axis. Browser: the browser names. | Year: same. Browser: the names above the first cluster. | Month: x axis. City: the names at the line ends. |

A browser group is spread across the chart, so its indicator is one outline per segment (`unionOfRectPaths`). A year sits in one place, so one box is enough.

<<< @/patterns/charts/dual-stacked.js#focus{js}

## When to use something else

- Only one category? Use a [list](./list) or a [tree](./tree).
- Two numerical axes? Use [2D spatial](./spatial).
- Two numbers and a category? Use [spatial plus](./spatial-plus). It is a dual tree with a third dimension.
