# Input

The **input** module handles keyboard events and manages navigation state.

## Adding Navigation Rules

Tell Data Navigator which keys do what:

```js
const structure = {
  nodes: { /* ... */ },
  edges: { /* ... */ },
  navigationRules: {
    left: { key: 'ArrowLeft', direction: 'source' },
    right: { key: 'ArrowRight', direction: 'target' },
    exit: { key: 'Escape', direction: 'target' }
  }
}
```

Each rule specifies:
- **A name** — `left`, `right`, `exit`
- **A key** — The keyboard key code
- **A direction** — Follow edge to `source` or `target`

## Applying Rules to Edges

Tell each edge which rules apply:

```js
edges: {
  '_0-_1': {
    source: '_0',
    target: '_1',
    navigationRules: ['left', 'right']
  },
  '_1-_2': {
    source: '_1',
    target: '_2',
    navigationRules: ['left', 'right']
  },
  '_2-_3': {
    source: '_2',
    target: '_3',
    navigationRules: ['left', 'right']
  },
  'any-exit': {
    source: (d, c) => c,
    target: () => '',
    navigationRules: ['exit']
  }
}
```

The `any-exit` edge is special—it uses functions so it works from any node.

## Creating the Input Handler

```js
import dataNavigator from 'data-navigator'

const input = dataNavigator.input({
  structure: structure,
  navigationRules: structure.navigationRules,
  entryPoint: '_0',
  exitPoint: 'exit-element-id'
})
```

## Key Methods

| Method | Description |
|--------|-------------|
| `input.enter()` | Returns the entry point node |
| `input.exit()` | Returns the exit point ID |
| `input.move(currentId, direction)` | Returns the next node |
| `input.keydownValidator(event)` | Converts KeyboardEvent to direction |
| `input.focus(renderId)` | Focuses a rendered element |

## Usage Example

```js
document.addEventListener('keydown', (event) => {
  const direction = input.keydownValidator(event)
  
  if (direction) {
    event.preventDefault()
    const nextNode = input.move(currentNodeId, direction)
    if (nextNode) {
      currentNodeId = nextNode.id
      // Update UI...
    }
  }
})
```

## Next Steps

Continue to [Rendering](/getting-started/rendering) to create the accessible HTML layer.
