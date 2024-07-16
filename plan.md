# Plan

## First priorities:

-   build out the `structure` module, which should generate node-edge data structure from input JSON
    -   create toGraphViz method
    -   create fromGraphViz method: look at perfopticon? (see how they did it)
    -   create node builder, edgebuilder, and navbuilder (and wrap all 3 into 1)
    -   add example with set diagram

## Follow-up work (big picture stuff):

-   Build UI tool for creating DN strcture visually
-   Models to help with UI tool?
-   Keyboard instructions
-   Build examples:
    -   Visualizations:
        -   Maps/spatial
        -   Graphs/diagrams
        -   Sankey/alluvial/flow
        -   Math functions
        -   Super cool custom work
    -   Non-visualizations:
        -   Simple game UI in canvas or webGL
        -   Simple Doc UI in canvas or webGL
        -   ??
    -   Patterns:
        -   Serial (bar)
        -   Simple Nested (scatter aka vega-lite example we currently have)
        -   Grouped (bar/line)
        -   Binned (histogram/continuous scale line/scatter)
        -   Multi-tree (existing example with highcharts)
        -   ??
    -   Input modalities
        -   Screen reader/keyboard
        -   Voice
        -   Hand gesture
        -   touch (and mobile screen reader)
        -   Click + focus handling (with on-demand rendering?)
-   Run user studies on previous examples
    -   Put user study results on the webpage itself perhaps?
