# Structure

Structure defines the navigable graph—nodes and edges.

::: tip Why a Graph?
Unlike HTML's tree-based DOM, graphs let us express *direct relationships*. A user can jump from "Apple at Store A" directly to "Banana at Store A" without traversing parent containers.
:::

## Building a List Structure

### Step 1: Define Nodes

```js
const structure = {
  nodes: {
    _0: {
      id: '_0',
      data: { fruit: 'apple', store: 'a', cost: 3 },
      edges: ['_0-_1']
    },
    _1: {
      id: '_1',
      data: { fruit: 'banana', store: 'a', cost: 0.75 },
      edges: ['_0-_1', '_1-_2']
    },
    _2: {
      id: '_2',
      data: { fruit: 'apple', store: 'b', cost: 2.75 },
      edges: ['_1-_2', '_2-_3']
    },
    _3: {
      id: '_3',
      data: { fruit: 'banana', store: 'b', cost: 1.25 },
      edges: ['_2-_3']
    }
  },
  edges: {}
}
```

### Step 2: Define Edges

```js
edges: {
  '_0-_1': { source: '_0', target: '_1' },
  '_1-_2': { source: '_1', target: '_2' },
  '_2-_3': { source: '_2', target: '_3' }
}
```

## Visualizing the Structure

Our structure is a linked list:

```
[_0] ←→ [_1] ←→ [_2] ←→ [_3]
apple/a  banana/a  apple/b  banana/b
```

<Example id="structure-viz" height="180px" label="Graph visualization showing 4 nodes connected in a line" />

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  const waitForD3 = () => new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      if (typeof d3 !== 'undefined') resolve()
      else if (Date.now() - start > 5000) reject(new Error('D3 not loaded'))
      else setTimeout(check, 50)
    }
    check()
  })

  try {
    await waitForD3()
    
    const nodes = [
      { id: '_0', label: 'apple/a' },
      { id: '_1', label: 'banana/a' },
      { id: '_2', label: 'apple/b' },
      { id: '_3', label: 'banana/b' }
    ]
    
    const links = [
      { source: '_0', target: '_1' },
      { source: '_1', target: '_2' },
      { source: '_2', target: '_3' }
    ]

    const width = 400, height = 130
    const container = document.getElementById('structure-viz')
    if (!container) return
    
    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', 'Graph: apple/a to banana/a to apple/b to banana/b')

    const nodeSpacing = width / (nodes.length + 1)
    nodes.forEach((node, i) => {
      node.x = nodeSpacing * (i + 1)
      node.y = height / 2 - 10
    })

    svg.selectAll('line').data(links).join('line')
      .attr('x1', d => nodes.find(n => n.id === d.source).x)
      .attr('y1', d => nodes.find(n => n.id === d.source).y)
      .attr('x2', d => nodes.find(n => n.id === d.target).x)
      .attr('y2', d => nodes.find(n => n.id === d.target).y)
      .attr('stroke', '#999').attr('stroke-width', 2)

    const g = svg.selectAll('g').data(nodes).join('g')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)

    g.append('circle').attr('r', 18).attr('fill', '#1e3369')
    g.append('text').attr('dy', 38).attr('text-anchor', 'middle')
      .attr('font-size', '11px').attr('fill', 'currentColor').text(d => d.label)
  } catch (e) {
    console.error('Failed to create structure visualization:', e)
  }
})
</script>

## What's Missing?

This structure defines *what* can be navigated, but not *how*. For that, we need navigation rules.

## Next Steps

Continue to [Input](/getting-started/input) to add navigation rules.
