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
import dataNavigator from 'data-navigator'

// Data: fruit sales by store
const data = [
  { fruit: 'apple', store: 'A', value: 3 },
  { fruit: 'banana', store: 'A', value: 0.75 },
  { fruit: 'apple', store: 'B', value: 2.75 },
  { fruit: 'banana', store: 'B', value: 1.25 }
]

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
]

// Build structure with dimensions
const { nodes, edges, navigationRules } = dataNavigator.structure({
  data,
  dimensions,
  // Map data to dimension values
  dimensionMap: (d) => ({
    fruit: d.fruit,
    store: d.store
  })
})
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
Navigate: `Left`/`Right` between fruits, `Up`/`Down` between stores *within the same fruit*

**Tree 2: Organized by Store**
```
Store A
├─ apple-A
└─ banana-A

Store B
├─ apple-B
└─ banana-B
```
Navigate: `Up`/`Down` between stores, `Left`/`Right` between fruits *within the same store*

**Result:** You can move in any direction while staying within a dimensional constraint:
- `Left`/`Right` - Move between fruits (apple ↔ banana)
- `Up`/`Down` - Move between stores (A ↔ B)
- `Enter` - Drill into child dimensions
- `Backspace` - Return to parent dimensions

This creates intuitive 2D navigation where both dimensions are always accessible.

### `input(options)`

Creates input handler for keyboard navigation.

```ts
const handler = input({
  structure: Structure,
  navigationRules: NavigationRules,
  entryPoint?: string,
  exitPoint?: string
})

handler.enter()              // Returns entry node
handler.exit()               // Returns exit ID
handler.move(id, direction)  // Returns next node
handler.keydownValidator(e)  // Converts event to direction
handler.focus(renderId)      // Focuses element
```

### `rendering(options)`

Creates renderer for accessible HTML.

```ts
const renderer = rendering({
  elementData: Nodes,
  suffixId: string,
  root: { id, description?, width?, height? },
  entryButton?: { include, callbacks? },
  exitElement?: { include, callbacks? }
})

renderer.initialize()
renderer.render(nodeData)
renderer.remove(renderId)
renderer.clearStructure()
```

## Utilities

```ts
import { describeNode, createValidId } from 'data-navigator/utilities'

describeNode(datum, options)  // Generate description
createValidId(str)            // Create valid HTML ID
```

## Further Reading

- [TypeScript Source](https://github.com/cmudig/data-navigator/tree/main/src)
- [Research Paper](https://www.frank.computer/data-navigator/)
