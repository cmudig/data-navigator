# API Reference

::: warning Under Construction
Complete API documentation is coming soon. See the [TypeScript source](https://github.com/cmudig/data-navigator/tree/main/src).
:::

## Modules

### `structure(options)`

Generates navigation structure from data. This is accomplished using our **Dimensions API**.

#### Dimensions API

The **Dimensions API** enables multiple, simultaneous, tree-like, hierarchical data structures by defining dimensional relationships. This is ideal for hierarchical charts like stacked bars, grouped bars, multi-line charts, or any visualization with more than one category or dimension that should be navigable.

**Example: Stacked Bar Chart with Hierarchy**

```js
import dataNavigator from 'data-navigator';

// Data: fruit sales by store
const data = [
    { fruit: 'apple', store: 'A', value: 3 },
    { fruit: 'banana', store: 'A', value: 0.75 },
    { fruit: 'apple', store: 'B', value: 2.75 },
    { fruit: 'banana', store: 'B', value: 1.25 }
];

// Define dimensions: fruit > store
const dimensions = [
    {
        name: 'fruit',
        values: ['apple', 'banana']
    },
    {
        name: 'store',
        values: ['A', 'B']
    }
];

// Build structure with dimensions
const { nodes, edges, navigationRules } = dataNavigator.structure({
    data,
    dimensions,
    // Map data to dimension values
    dimensionMap: d => ({
        fruit: d.fruit,
        store: d.store
    })
});
```

**How it works:**

The dimensions API creates **two simultaneous tree structures**:

**Tree 1: Organized by Fruit**

```
apple
├─ apple-A
└─ apple-B

banana
├─ banana-A
└─ banana-B
```

Navigate: `Left`/`Right` between fruits, `Up`/`Down` between stores _within the same fruit_

**Tree 2: Organized by Store**

```
Store A
├─ apple-A
└─ banana-A

Store B
├─ apple-B
└─ banana-B
```

Navigate: `Up`/`Down` between stores, `Left`/`Right` between fruits _within the same store_

**Result:** You can move in any direction while staying within a dimensional constraint:

- `Left`/`Right` - Move between fruits (apple ↔ banana)
- `Up`/`Down` - Move between stores (A ↔ B)
- `Enter` - Drill into child dimensions
- `Backspace` - Return to parent dimensions

This creates intuitive 2D navigation where both dimensions are always accessible.

#### Frame

`frame` puts descriptive chart parts in front of the data: root, then title, subtitle, axes, and legends, then a data node. It works with dimensions, `spatialGrid`, or `hierarchy`. See the [Basic Frame pattern](/patterns/frame).

```ts
structure({
    data,
    idKey: 'id',
    frame: {
        root: { id: 'chart', semantics: { label: 'Bar chart of fruit counts.' } },
        elements: [
            { id: 'title', semantics: { label: 'Title: Fruit in the basket.' } },
            { id: 'y-axis', semantics: { label: 'Y axis: Count, 0 to 7.' } },
            { id: 'x-axis', semantics: { label: 'X axis: Fruit.' } }
        ],
        data: { id: 'data' }, // optional
        behavior: { extents: 'circular' }, // or 'terminal'
        navigationRules: { sibling_sibling: ['left', 'right'], parent_child: ['drill-out', 'drill-in'] }
    },
    dimensions: {
        values: [
            /* ... */
        ]
    }
});
// structure.frame => { rootId, elementIds, dataId, parentRules }
```

- `elements` never have children. Enter does nothing on them.
- With two or more dimensions, `data` becomes their level 0 node. If you leave it out, a node with id `data` is made for you.
- With one dimension, a grid, or a hierarchy, leave `data` out and the top node of that structure is the last item. If you pass `data`, it wraps that top node.

#### Spatial grid

`spatialGrid` cuts the plot into a nested grid over two numerical fields. See the [2D Spatial pattern](/patterns/spatial).

```ts
structure({
    data,
    idKey: 'id',
    spatialGrid: {
        xKey: 'horsepower',
        yKey: 'mpg',
        xExtent: [40, 240], // defaults to the data's min and max
        yExtent: [10, 50],
        levels: [2, 4], // 2x2, then 4x4
        leaves: 'points', // or 'cells' when each row is a heatmap cell
        levelNavigation: 'across', // or 'within'
        skipEmpty: true,
        extents: 'terminal', // or 'circular'
        root: { id: 'grid' },
        cellIds: (level, col, row) => `cell-${level}-${col}-${row}`, // optional
        navigationRules: { x: ['left', 'right'], y: ['up', 'down'], parent_child: ['drill-out', 'drill-in'] }
    }
});
// structure.spatialGrid => { rootId, levels, cellsByLevel, leafIds, parentRules }
```

- Each cell node has `data: { level, col, row, cellsPerAxis, xExtent, yExtent, count }`. Row 0 is the lowest y.
- `levelNavigation: 'across'` links every cell at a zoom level, so the arrow keys cross region borders. With `'points'` leaves, Left and Right walk every point in x order and Up and Down walk them in y order.
- Rule pairs are `[moveToSource, moveToTarget]`. x edges run low to high. y edges run high to low, so the default `['up', 'down']` moves up toward higher values.

#### Hierarchy

`hierarchy` builds a tree of any depth from rows that name their parent, like `d3.stratify`. Every row becomes a node. See the [Tree pattern](/patterns/tree).

```ts
structure({
    data: [
        { id: 'flare', parent: '' },
        { id: 'analytics', parent: 'flare' },
        { id: 'cluster', parent: 'analytics', size: 15207 }
    ],
    idKey: 'id',
    hierarchy: {
        parentKey: 'parent',
        sortFunction: (a, b) => b.size - a.size, // optional, orders siblings
        levelNavigation: 'within', // or 'across' to link every node at the same depth
        extents: 'circular', // or 'terminal'
        navigationRules: { sibling_sibling: ['left', 'right'], parent_child: ['drill-out', 'drill-in'] }
    }
});
// structure.hierarchy => { rootId, depthCount, parentRules }
```

Frame, spatial grid, and hierarchy nodes also get `parentId` and `depth`. The inspector's tree view uses them for its layout.

### `input(options)`

Creates input handler for keyboard navigation.

```ts
const handler = input({
    structure: Structure,
    navigationRules: NavigationRules,
    entryPoint: string,
    exitPoint: string
});

handler.enter(); // Returns entry node
handler.exit(); // Returns exit ID
handler.move(id, direction); // Returns next node
handler.keydownValidator(e); // Converts event to direction
handler.focus(renderId); // Focuses element
```

### `rendering(options)`

Creates renderer for accessible HTML.

```ts
const renderer = rendering({
    elementData: Nodes,
    suffixId: string,
    root: { id, description, width, height },
    entryButton: { include, callbacks },
    exitElement: { include, callbacks }
});

renderer.initialize();
renderer.render(nodeData);
renderer.remove(renderId);
renderer.clearStructure();
```

## Utilities

```ts
import { describeNode, createValidId } from 'data-navigator/utilities';

describeNode(datum, options); // Generate description
createValidId(str); // Create valid HTML ID
```

### Geometry

Helpers that return SVG path strings for `spatialProperties.path`, in chart pixel coordinates.

```ts
import {
    boundingRectPath, // one box around many rects
    unionOfRectPaths, // one outline per rect, as a single path
    convexHullOfRects, // hull around rects
    convexHullOfCircles, // hull around circles, e.g. a group of scatter points
    offsetLinePath, // a band that follows a polyline
    convexHullPath,
    expandHull,
    grahamScan
} from 'data-navigator';
```

## Further Reading

- [TypeScript Source](https://github.com/cmudig/data-navigator/tree/main/src)
- [Research Paper](https://www.frank.computer/data-navigator/)
