# Rendering

The **rendering** module creates the accessible HTML layer.

## Adding Rendering Properties

Each node needs:

### renderId

The DOM element ID:

```js
nodes: {
  _0: {
    id: '_0',
    renderId: '_0',
    // ...
  }
}
```

### semantics

Accessibility attributes—the label screen readers announce:

```js
_0: {
  id: '_0',
  renderId: '_0',
  semantics: {
    label: 'fruit: apple. store: a. cost: 3. Data point.'
  },
  // ...
}
```

::: tip Utility Function

```js
import { describeNode } from 'data-navigator/utilities';

const label = describeNode({ fruit: 'apple', store: 'a', cost: 3 }, {});
// "fruit: apple. store: a. cost: 3. Data point."
```

:::

## Creating the Renderer

```js
import dataNavigator from 'data-navigator';

const renderer = dataNavigator.rendering({
    elementData: structure.nodes,
    defaults: { cssClass: 'dn-manual-focus-node' },
    suffixId: 'fruit-chart',
    root: {
        id: 'chart-wrapper',
        description: 'Fruit cost by store chart. Use arrow keys to navigate.',
        width: '100%',
        height: 0
    },
    entryButton: {
        include: true,
        callbacks: { click: enterChart }
    },
    exitElement: {
        include: true
    }
});

renderer.initialize();
```

## Key Methods

| Method                      | Description                    |
| --------------------------- | ------------------------------ |
| `renderer.initialize()`     | Set up DOM structure           |
| `renderer.render(nodeData)` | Render a node, returns element |
| `renderer.remove(renderId)` | Remove a rendered node         |
| `renderer.clearStructure()` | Remove all nodes               |

## Generated HTML

```html
<div id="chart-wrapper" class="dn-root">
    <div
        id="dn-wrapper-fruit-chart"
        role="application"
        aria-label="Fruit cost by store chart. Use arrow keys to navigate."
    >
        <button class="dn-entry-button">Enter navigation area</button>

        <figure id="_0" class="dn-manual-focus-node" tabindex="0">
            <div role="img" aria-label="fruit: apple..."></div>
        </figure>
    </div>

    <div id="dn-exit-fruit-chart" class="dn-exit-position">End of data structure.</div>
</div>
```

## Next Steps

Let's put everything together in [First Navigable Chart](/getting-started/first-chart).
