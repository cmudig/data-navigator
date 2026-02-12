# First Navigable Chart

Let's put everything together!

## The Final Result

<Example id="chart" height="420px" label="Fruit cost by store. Navigable stacked bar chart." />

**Try it out:**
1. Click "Enter navigation area" (or tab and press <kbd>Enter</kbd>)
2. Use <kbd>←</kbd> and <kbd>→</kbd> arrow keys to navigate
3. Press <kbd>Escape</kbd> to exit

<script setup>
import { onMounted, onUnmounted } from 'vue'

let cleanup = null

onMounted(async () => {
  const waitFor = (check, timeout = 5000) => new Promise((resolve, reject) => {
    const start = Date.now()
    const poll = () => {
      if (check()) resolve()
      else if (Date.now() - start > timeout) reject(new Error('Timeout'))
      else setTimeout(poll, 50)
    }
    poll()
  })

  try {
    await waitFor(() => typeof Bokeh !== 'undefined' && Bokeh.Plotting)
    await waitFor(() => document.getElementById('chart'))

    // ============================================
    // Bokeh Chart with Focus Indicator Support
    // ============================================
    
    const chartWidth = 300
    const chartHeight = 300
    
    // Data for programmatically drawing focus outlines
    const interactiveData = {
      data: [
        [[3, 2.75], [0, 0]],      // apple: [top values], [bottom values]
        [[3.75, 4], [3, 2.75]]    // banana: [top values], [bottom values]
      ],
      indices: {
        fruit: { apple: 0, banana: 1 },
        store: { a: 0, b: 1 }
      }
    }
    
    // Function to draw Bokeh chart with optional focus indicator
    const drawChart = (focusData) => {
      const container = document.getElementById('chart')
      container.innerHTML = ''
      
      const stores = ['a', 'b']
      const plt = Bokeh.Plotting
      const p = plt.figure({
        x_range: stores, y_range: [0, 5.5], 
        height: chartHeight, width: chartWidth,
        title: 'Fruit cost by store', output_backend: 'svg',
        toolbar_location: null, tools: ''
      })
      
      // Apple bars (bottom)
      p.vbar({ x: stores, top: [3, 2.75], bottom: [0, 0], width: 0.8, 
               color: '#FCB5B6', line_color: '#8F0002' })
      // Banana bars (stacked on top)
      p.vbar({ x: stores, top: [3.75, 4], bottom: [3, 2.75], width: 0.8, 
               color: '#F9E782', line_color: '#766500' })
      
      // Draw focus indicator outline if provided
      if (focusData) {
        p.vbar({
          x: stores,
          top: focusData.top,
          bottom: focusData.bottom,
          width: 0.8,
          line_width: 3,
          color: ['transparent', 'transparent'],
          line_color: focusData.line_color
        })
      }
      
      // Legend
      const r1 = p.square([-10000], [-10000], { color: '#FCB5B6', line_color: '#8F0002' })
      const r2 = p.square([-10000], [-10000], { color: '#F9E782', line_color: '#766500' })
      p.add_layout(new Bokeh.Legend({
        items: [
          new Bokeh.LegendItem({ label: 'apple', renderers: [r1] }),
          new Bokeh.LegendItem({ label: 'banana', renderers: [r2] })
        ],
        location: 'top_left', orientation: 'horizontal'
      }))
      
      plt.show(p, '#chart')
      
      // Hide Bokeh's inaccessible elements from AT
      const bokehPlot = document.querySelector('#chart > div')
      if (bokehPlot) bokehPlot.setAttribute('inert', 'true')
    }
    
    // Initial chart draw (no focus)
    drawChart(null)

    // ============================================
    // Import Data Navigator
    // ============================================
    
    const { default: dataNavigator } = await import('data-navigator')

    // ============================================
    // Define Structure with spatialProperties
    // ============================================
    
    let exitHandler = null
    
    const structure = {
      nodes: {
        _0: { 
          id: '_0', renderId: '_0', 
          data: { fruit: 'apple', store: 'a', cost: 3 },
          edges: ['_0-_1', 'any-exit'], 
          semantics: { label: 'fruit: apple. store: a. cost: 3. Data point.' },
          // Cover entire chart - focus indicator drawn by Bokeh
          spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        },
        _1: { 
          id: '_1', renderId: '_1', 
          data: { fruit: 'banana', store: 'a', cost: 0.75 },
          edges: ['_0-_1', '_1-_2', 'any-exit'], 
          semantics: { label: 'fruit: banana. store: a. cost: 0.75. Data point.' },
          spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        },
        _2: { 
          id: '_2', renderId: '_2', 
          data: { fruit: 'apple', store: 'b', cost: 2.75 },
          edges: ['_1-_2', '_2-_3', 'any-exit'], 
          semantics: { label: 'fruit: apple. store: b. cost: 2.75. Data point.' },
          spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        },
        _3: { 
          id: '_3', renderId: '_3', 
          data: { fruit: 'banana', store: 'b', cost: 1.25 },
          edges: ['_2-_3', 'any-exit'], 
          semantics: { label: 'fruit: banana. store: b. cost: 1.25. Data point.' },
          spatialProperties: { x: 0, y: 0, width: chartWidth, height: chartHeight }
        }
      },
      edges: {
        '_0-_1': { source: '_0', target: '_1', navigationRules: ['left', 'right'] },
        '_1-_2': { source: '_1', target: '_2', navigationRules: ['left', 'right'] },
        '_2-_3': { source: '_2', target: '_3', navigationRules: ['left', 'right'] },
        'any-exit': { 
          source: (d, c) => c, 
          target: () => { if (exitHandler) exitHandler(); return '' }, 
          navigationRules: ['exit'] 
        }
      },
      navigationRules: {
        left: { key: 'ArrowLeft', direction: 'source' },
        right: { key: 'ArrowRight', direction: 'target' },
        exit: { key: 'Escape', direction: 'target' }
      }
    }

    // ============================================
    // State & Tooltip
    // ============================================
    
    let current = null, previous = null
    
    const showTooltip = (node) => {
      const tooltip = document.getElementById('chart-tooltip')
      if (tooltip && node.semantics?.label) {
        tooltip.textContent = node.semantics.label
        tooltip.classList.remove('hidden')
        // Position tooltip to the right of the chart
        tooltip.style.transform = `translate(${chartWidth + 10}px, ${chartHeight / 2 - 20}px)`
      }
    }
    
    const hideTooltip = () => {
      const tooltip = document.getElementById('chart-tooltip')
      if (tooltip) tooltip.classList.add('hidden')
    }
    
    // Draw focus indicator on the Bokeh chart
    const drawFocusIndicator = (node) => {
      if (!node?.data) return
      
      const fruitIndex = interactiveData.indices.fruit[node.data.fruit]
      const storeIndex = interactiveData.indices.store[node.data.store]
      const barData = interactiveData.data[fruitIndex]
      
      // line_color array: [store_a_color, store_b_color]
      const line_color = storeIndex === 0 ? ['#000000', 'transparent'] : ['transparent', '#000000']
      
      drawChart({
        top: barData[0],
        bottom: barData[1],
        line_color
      })
    }

    // ============================================
    // Create Renderer
    // ============================================
    
    const enter = () => {
      const nextNode = input.enter()
      if (nextNode) initiateLifecycle(nextNode)
    }
    
    const renderer = dataNavigator.rendering({
      elementData: structure.nodes,
      defaults: { cssClass: 'dn-manual-focus-node' },  // Transparent overlay
      suffixId: 'fruit-chart',
      root: { 
        id: 'chart-wrapper', 
        description: 'Fruit cost by store chart. Use arrow keys to navigate.', 
        width: '100%', 
        height: 0 
      },
      entryButton: { include: true, callbacks: { click: enter } },
      exitElement: { include: true }
    })
    renderer.initialize()

    exitHandler = () => {
      renderer.exitElement.style.display = 'block'
      input.focus(renderer.exitElement.id)
      if (current) { 
        renderer.remove(current)
        current = null 
      }
      hideTooltip()
      drawChart(null)  // Remove focus indicator
    }

    // ============================================
    // Create Input Handler
    // ============================================
    
    const input = dataNavigator.input({
      structure, 
      navigationRules: structure.navigationRules,
      entryPoint: '_0', 
      exitPoint: renderer.exitElement?.id
    })

    // ============================================
    // Navigation Lifecycle
    // ============================================
    
    const move = (direction) => {
      const nextNode = input.move(current, direction)
      if (nextNode) initiateLifecycle(nextNode)
    }
    
    const initiateLifecycle = (nextNode) => {
      if (previous) renderer.remove(previous)
      
      const element = renderer.render({ renderId: nextNode.renderId, datum: nextNode })
      
      element.addEventListener('keydown', (e) => {
        const direction = input.keydownValidator(e)
        if (direction) { e.preventDefault(); move(direction) }
      })
      
      element.addEventListener('focus', () => {
        showTooltip(nextNode)
        drawFocusIndicator(nextNode)  // Redraw chart with outline
      })
      
      element.addEventListener('blur', () => {
        hideTooltip()
      })
      
      input.focus(nextNode.renderId)
      previous = current
      current = nextNode.id
    }

    cleanup = () => { if (renderer) renderer.clearStructure() }
  } catch (e) {
    console.error('Failed to initialize:', e)
    const container = document.getElementById('chart')
    if (container) {
      container.innerHTML = `<p style="color: var(--vp-c-danger-1);">Error: ${e.message}</p>`
    }
  }
})

onUnmounted(() => { if (cleanup) cleanup() })
</script>

## Trouble with Focus Indication

You may have noticed something important: the focus indicator is drawn *by Bokeh*, not by Data Navigator's rendered element. This is because Bokeh renders to `<canvas>` — pure pixels with no DOM elements to position over.

::: warning The Challenge with Canvas/Pixel Rendering
Most visualization libraries don't expose element coordinates. This means you can't position a DOM focus indicator precisely over a specific bar or point. The workaround is:

1. Position the Data Navigator element to cover the **entire chart**
2. Draw the focus indicator **programmatically** using the visualization library itself
:::

This is why accessibility support from visualization libraries themselves is so important. Ideally, Bokeh (and others) would make charts navigable by default.

## The Complete Code

::: code-group

```js [Full Example]
import dataNavigator from 'data-navigator'

// Data for drawing focus outlines
const interactiveData = {
  data: [
    [[3, 2.75], [0, 0]],      // apple
    [[3.75, 4], [3, 2.75]]    // banana
  ],
  indices: {
    fruit: { apple: 0, banana: 1 },
    store: { a: 0, b: 1 }
  }
}

// 1. Define Structure - all elements cover full chart
const structure = {
  nodes: {
    _0: { 
      id: '_0', renderId: '_0', 
      data: { fruit: 'apple', store: 'a', cost: 3 },
      edges: ['_0-_1', 'any-exit'],
      semantics: { label: 'fruit: apple. store: a. cost: 3.' },
      spatialProperties: { x: 0, y: 0, width: 300, height: 300 }
    },
    // ... other nodes with same spatialProperties
  },
  edges: { /* ... */ },
  navigationRules: { /* ... */ }
}

// 2. Draw focus indicator by redrawing Bokeh chart
const drawFocusIndicator = (node) => {
  const fruitIndex = interactiveData.indices.fruit[node.data.fruit]
  const storeIndex = interactiveData.indices.store[node.data.store]
  const barData = interactiveData.data[fruitIndex]
  
  // Only outline the focused bar
  const line_color = storeIndex === 0 
    ? ['#000000', 'transparent'] 
    : ['transparent', '#000000']
  
  // Redraw chart with outline
  drawChart({ top: barData[0], bottom: barData[1], line_color })
}

// 3. On focus event, draw the indicator
element.addEventListener('focus', () => {
  drawFocusIndicator(nextNode)
})
```

```css [Required CSS]
/* Transparent overlay - doesn't block the chart visually */
.dn-manual-focus-node {
  background: transparent;
  border: none;
}

/* Browser focus ring still appears around the chart area */
.dn-manual-focus-node:focus {
  outline: 3px solid #1e3369;
  outline-offset: 2px;
}
```

:::

## Key Takeaways

::: tip spatialProperties for Focus Indication
Every node needs `spatialProperties` with `x`, `y`, `width`, `height`. For canvas-based charts where you can't position over specific elements, cover the entire chart and draw the indicator programmatically using your charting library (like we did with Bokeh here).
:::

::: tip Render On Demand
We still only render one node at a time, keeping the DOM clean.
:::

## Next Steps

Congratulations! You've built your first accessible, navigable chart. Explore the [Examples](/examples/) for more patterns, including SVG-based charts where element positioning *is* possible.
