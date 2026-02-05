# API Reference

::: warning Under Construction
Complete API documentation is coming soon. See the [TypeScript source](https://github.com/cmudig/data-navigator/tree/main/src).
:::

## Modules

### `structure(options)`

Generates navigation structure from data.

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
