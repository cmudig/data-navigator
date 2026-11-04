---
title: Focus Indication
---

<script setup>
import { onMounted } from 'vue';

onMounted(async () => {
    const { drawFigures } = await import('./focus/figures.js');
    drawFigures(document.querySelector('.fi-page'));
});
</script>

<style>
.fi-page {
    --fi-c0: #2a78d6;
    --fi-c1: #eb6834;
    --fi-c2: #1baf7a;
    --fi-c3: #eda100;
}
.dark .fi-page {
    --fi-c0: #3987e5;
    --fi-c1: #d95926;
    --fi-c2: #199e70;
    --fi-c3: #c98500;
}
.fi-figure {
    max-width: 420px;
    margin: 1rem 0;
    padding: 0.75rem;
    border: 1px solid var(--vp-c-divider);
    border-radius: 8px;
    background: var(--vp-c-bg);
}
.fi-svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
}
.fi-c0 { fill: var(--fi-c0); }
.fi-c1 { fill: var(--fi-c1); }
.fi-c2 { fill: var(--fi-c2); }
.fi-c3 { fill: var(--fi-c3); }
.fi-mark {
    stroke: var(--vp-c-bg);
    stroke-width: 1;
}
.fi-line {
    fill: none;
    stroke-width: 2.5;
}
.fi-s0 { stroke: var(--fi-c0); }
.fi-s1 { stroke: var(--fi-c1); }
.fi-axis {
    stroke: var(--vp-c-text-3);
}
.fi-text {
    fill: var(--vp-c-text-1);
    font-size: 13px;
}
.fi-halo,
.fi-indicator {
    fill: none;
    stroke-linejoin: round;
}
.fi-halo {
    stroke: var(--vp-c-bg);
    stroke-width: 6;
}
.fi-indicator {
    stroke: var(--vp-c-text-1);
    stroke-width: 3;
}
</style>

<div class="fi-page">

# Focus Indication

A focus indicator shows where someone is in a chart. Keyboard users, switch users, people using voice or gestures, and sighted screen reader users all rely on it. The figures below are static and show common shapes for indicators, with the geometry helper that builds each one.

## Guidelines

- **Make it visible.** Focus must be visible ([WCAG 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)). Aim for an outline at least 2px thick with 3:1 contrast against what it sits on ([WCAG 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html), [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
- **Match the shape of what is focused.** A box for a bar, an outline around each segment of a series, a band for a line, a hull for a group of points.
- **Leave a gap.** Pad the indicator outward so it doesn't cover the mark or change how big it looks.
- **Contrast with the marks and the background.** Marks come in many colors. The figures here draw the indicator twice: a wide stroke in the background color, then a narrower stroke in the text color on top. This keeps it visible on any mark.
- **Don't rely on color alone.** A change in fill or opacity is easy to miss. An outline adds shape.

[Chartability](https://www.frank.computer/chartability/) covers these and related checks in more depth.

## How Data Navigator draws them

Data Navigator renders one element at a time over your chart, sized by `spatialProperties` (`x`, `y`, `width`, `height`). When you add `spatialProperties.path`, it draws that SVG path as the element's outline. The geometry helpers return these paths from the shapes you already have.

```js
import {
    boundingRectPath,
    unionOfRectPaths,
    convexHullOfRects,
    convexHullOfCircles,
    offsetLinePath
} from 'data-navigator';

node.spatialProperties = { x, y, width, height, path: boundingRectPath([bar], 3) };
```

Charts drawn on a `<canvas>` have no elements to measure, so you may need to draw the indicator yourself. See [Trouble with Focus Indication](/getting-started/first-chart#trouble-with-focus-indication).

## A single bar

`boundingRectPath` draws one box around one or more rects. The second argument is the padding.

<div class="fi-figure" id="fi-bar"></div>

<<< @/examples/focus/figures.js#bar{js}

## A column of a stacked bar

The same helper, given every segment in the column, draws one box around all of them.

<div class="fi-figure" id="fi-column"></div>

<<< @/examples/focus/figures.js#column{js}

## A series across columns

A series is spread out, so one box would cover marks that aren't part of it. `unionOfRectPaths` outlines each rect on its own, in one path.

<div class="fi-figure" id="fi-series"></div>

<<< @/examples/focus/figures.js#series{js}

## A cluster of uneven bars

`convexHullOfRects` wraps a group of rects tightly, following the tops of bars with different heights.

<div class="fi-figure" id="fi-cluster"></div>

<<< @/examples/focus/figures.js#cluster{js}

## A group of points

`convexHullOfCircles` wraps a set of circles, including their radius and the padding.

<div class="fi-figure" id="fi-scatter"></div>

<<< @/examples/focus/figures.js#scatter{js}

## A scatterplot split into ranges

When a scatterplot bins each axis into numerical ranges, a range covers a whole strip of the plot, not just the points in it. So its indicator is a band from edge to edge. [Skeleton](https://dig.cmu.edu/data-navigator/skeleton/) and the [Bokeh wrapper](https://dig.cmu.edu/data-navigator/bokeh-wrapper/examples/scatter) both draw scatterplots this way.

Build one rect per range from your scales. Each division node keeps its range in `numericalExtents`.

<<< @/examples/focus/figures.js#ranges{js}

### The whole chart

At the top of the chart, outline every range on both axes. Together they show the grid someone can move through.

<div class="fi-figure" id="fi-grid"></div>

<<< @/examples/focus/figures.js#grid{js}

### One axis

On an axis, like the x dimension, outline every range on that axis.

<div class="fi-figure" id="fi-columns"></div>

<<< @/examples/focus/figures.js#columns{js}

### One range

A single range gets a single band. An x range is a column, and a y range is a row. No padding, so neighboring bands line up.

<div class="fi-figure" id="fi-xrange"></div>

<<< @/examples/focus/figures.js#xrange{js}

<div class="fi-figure" id="fi-yrange"></div>

<<< @/examples/focus/figures.js#yrange{js}

### One point

A point gets a ring just outside its edge.

<div class="fi-figure" id="fi-point"></div>

<<< @/examples/focus/figures.js#point{js}

## A line

`offsetLinePath` draws a band that follows a polyline. The second argument is half the band's width.

<div class="fi-figure" id="fi-line"></div>

<<< @/examples/focus/figures.js#line{js}

## A legend or axis

Grouping nodes, like a dimension, can point to the guide that names them. A box around the legend works well.

<div class="fi-figure" id="fi-legend"></div>

<<< @/examples/focus/figures.js#legend{js}

## See them in use

- The [patterns](/patterns/) each include a focus indicator table for their charts.
- The [Many Ways demo](/demo) uses boxes, a series outline, and a legend box on one stacked bar chart.
- [Bespoke Visualization](/examples/bespoke) uses custom paths for marks that aren't rectangles.

</div>
