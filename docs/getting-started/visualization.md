# Example Visualization

We'll use [BokehJS](https://docs.bokeh.org/en/latest/docs/user_guide/advanced/bokehjs.html) to create a stacked bar chart. You can use _any_ visualization method—Bokeh is not required.

::: tip Why Bokeh?
Bokeh renders to Canvas, demonstrating that Data Navigator works even with pixel-based output. This shows accessibility can be added to _any_ visualization library.
:::

## The Chart

<Example id="viz-demo" height="350px" label="Fruit cost by store stacked bar chart" />

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  const waitForBokeh = () => new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      if (typeof Bokeh !== 'undefined' && Bokeh.Plotting) resolve()
      else if (Date.now() - start > 5000) reject(new Error('Bokeh not loaded'))
      else setTimeout(check, 50)
    }
    check()
  })

  try {
    await waitForBokeh()
    
    const stores = ['a', 'b']
    const plt = Bokeh.Plotting

    const p = plt.figure({
      x_range: stores,
      y_range: [0, 5.5],
      height: 300,
      width: 350,
      title: 'Fruit cost by store',
      output_backend: 'svg',
      toolbar_location: null,
      tools: ''
    })

    p.vbar({ x: stores, top: [3, 2.75], bottom: [0, 0], width: 0.8, color: '#FCB5B6', line_color: '#8F0002' })
    p.vbar({ x: stores, top: [3.75, 4], bottom: [3, 2.75], width: 0.8, color: '#F9E782', line_color: '#766500' })

    const r1 = p.square([-10000], [-10000], { color: '#FCB5B6', line_color: '#8F0002' })
    const r2 = p.square([-10000], [-10000], { color: '#F9E782', line_color: '#766500' })
    const legend = new Bokeh.Legend({
      items: [
        new Bokeh.LegendItem({ label: 'apple', renderers: [r1] }),
        new Bokeh.LegendItem({ label: 'banana', renderers: [r2] })
      ],
      location: 'top_left',
      orientation: 'horizontal'
    })
    p.add_layout(legend)

    plt.show(p, '#viz-demo')
    
    const plotEl = document.getElementById('viz-demo')
    if (plotEl) plotEl.setAttribute('inert', 'true')
  } catch (e) {
    console.error('Failed to load Bokeh chart:', e)
  }
})
</script>

## The Accessibility Problem

Try tabbing through this chart with your keyboard. **You can't interact with it at all.**

Bokeh renders this as a `<canvas>` element—pure pixels. There's nothing for a keyboard to focus on, nothing for a screen reader to announce.

## What We'll Build

By the end of this tutorial, you'll transform this chart so users can:

1. **Enter** using a button or keyboard shortcut
2. **Navigate** between all 4 data points using arrow keys
3. **Hear** descriptions via screen reader
4. **Exit** cleanly to continue browsing

## Next Steps

Let's learn about [Structure](/getting-started/structure).
