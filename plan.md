# Plan

## First priorities:

- right now, we have bugs:
  - the text chat is too verbose after issuing a command
  - the text chat's "help" gives commands that are not always possible or lead anywhere when on a node
  - "bar chart" in bokeh example has the wrong structure
  - navigating into crossline (bokeh wrapper) at first shouldn't have the legend-style of focus indication (only the whole box outline)
  - numerical divisions have the all-element division included with peers? (see scatter in bokeh example)
  - stacked bar  in bokeh example doesn't work

- build out the `structure` module, which should generate node-edge data structure from input JSON
    - create toGraphViz method
    - create fromGraphViz method: look at perfopticon? (see how they did it)
    - add example with set diagram

## Follow-up work (big picture stuff):

- Build UI tool for creating DN structure visually
- Models to help with UI tool?
- Keyboard instructions (added to rendering)
- Mobile screen reader-friendly prototype
- Build examples:
    - Visualizations:
        - Maps/spatial
        - Graphs/diagrams
        - Sankey/alluvial/flow
        - Math functions
        - Super cool custom work
    - Non-visualizations:
        - Simple game UI in canvas or webGL
        - Simple Doc UI in canvas or webGL
        - ??
    - "Patterns:"
        - Serial (bar)
        - Simple Nested (scatter aka vega-lite example we currently have)
        - Grouped (bar/line)
        - Binned (histogram/continuous scale line/scatter)
        - Multi-tree (existing example with highcharts)
        - ??
    - Input modalities
        - Voice
        - Hand gesture
        - Click + focus handling (with on-demand rendering?)
- Run user studies on previous examples
    - Put user study results on the webpage itself perhaps?
