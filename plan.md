# Plan

## Bugs

- right now, we have bugs:
    - I need to double-check the demo/example charts we use (all over) so that the screen reader experience provided by those libraries isn't something conflicting with what we're trying to do with data navigator. These are pretty buggy right now.
    - the text chat is too verbose after issuing a command
    - the text chat's "help" gives commands that are not always possible or lead anywhere when on a node
    - automatic names/semantics chosen for numerical divisions (see bokeh scatter examples) are awful and not informative (should use axis name and ranges)

## Follow-up work

- Refactor and de-slop skeleton's app
- modularize the scaffolding tool, make it a package
- Keyboard instructions (added to rendering)
- Build examples:
    - Visualizations:
        - Graphs/diagrams
        - Sankey/alluvial/flow
        - Math functions
    - Non-visualizations:
        - Simple game UI in canvas or webGL
        - Simple Doc UI in canvas or webGL
        - ??
    - "Patterns:"
        - Serial (bar)
        - Cross nav (stack, line, etc)
        - Within-nav (scatter)
        - Triple-nav (scatter with groups)
    - Input modalities
        - Voice
        - Hand gesture
