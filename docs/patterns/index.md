---
title: Patterns
---

# Patterns

A pattern is a navigation structure you can reuse across many charts. Pick the pattern that fits the data, then fit the keys and focus indicators to the chart's layout.

These patterns come from several projects: our collaboration with Adobe, our collaboration with [Bokeh](https://bokeh.org), the [Skeleton](https://dig.cmu.edu/data-navigator/skeleton/) authoring app, and other charts built with Data Navigator.

## Pick a pattern

| Pattern                        | Use it for                                               | Example charts                                  |
| ------------------------------ | -------------------------------------------------------- | ----------------------------------------------- |
| [List](./list)                 | A few marks, one category                                | Bar, pie, single line                           |
| [Basic Frame](./frame)         | Any chart with a title, axes, or legends drawn as pixels | Wraps any other pattern                         |
| [Tree](./tree)                 | One grouping, or a hierarchy of any depth                | Multi-line, circle packing, tree diagram        |
| [Dual Tree](./dual-tree)       | Two categories per data point                            | Stacked bar, clustered bar, multi-line by month |
| [2D Spatial](./spatial)        | Two numerical axes                                       | Scatterplot, heatmap                            |
| [Spatial Plus](./spatial-plus) | Two numerical axes and a category                        | Scatterplot colored by group                    |
| [Text Labels](./labels)        | Writing labels and letting people customize them         | All of the above                                |

Not sure? Count the groupings each data point belongs to.

- **None, just a few items:** list.
- **One:** tree.
- **Two categories:** dual tree.
- **Two numbers:** 2D spatial.
- **Two numbers and a category:** spatial plus.

Then wrap it in a frame if the chart draws its title, axes, or legends on a canvas.

## What every example includes

- **Keyboard navigation and text chat.** Both are always on. Text chat works on phones and tablets, where there is no keyboard. Type `enter`, then `help`.
- **A keys table**, made by the built-in commands table (`rendering`'s `commandsElement`) from the rules the structure actually uses.
- **The inspector in tree view**, which shows the structure and highlights where you are.
- **Alt text** for the canvas, written as: chart type, what it shows, one key takeaway.
- **Focus indicators** shaped like the marks: boxes for bars, arcs for slices, circles for points, bands for lines and ranges, hulls for scattered groups.
- **The spec**, pulled straight from the code that runs the demo.

Every chart is drawn with D3 on a `<canvas>`. A canvas is a single image to assistive technology, which is exactly the case Data Navigator is for. The focus indicators are drawn over the canvas using `spatialProperties.path` and the [geometry helpers](/api/#utilities) such as `convexHullOfCircles` and `offsetLinePath`.

## Shared code

- [canvas.js](https://github.com/cmudig/data-navigator/blob/main/docs/patterns/shared/canvas.js) draws text, axes, and legends, and returns their boxes for focus indicators.
- [charts.js](https://github.com/cmudig/data-navigator/blob/main/docs/patterns/shared/charts.js) draws the bar, line, stacked, clustered, and scatter charts.
- [mount.js](https://github.com/cmudig/data-navigator/blob/main/docs/patterns/shared/mount.js) connects one structure to keyboard input, text chat, the inspector, and the keys table.
- [labels.js](https://github.com/cmudig/data-navigator/blob/main/docs/patterns/shared/labels.js) builds labels from end-user settings.
