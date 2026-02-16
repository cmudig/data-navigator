# Data Navigator Inspector

This is part of the [Data Navigator](https://dig.cmu.edu/data-navigator/) project. The inspector visualizes a data-navigator `structure` object as a force-directed node-edge graph. As you navigate through the structure using keyboard controls, the focus indicator in the graph follows your position.

<details open>
<summary>Keyboard Controls</summary>

| Command                        | Key                                         |
| ------------------------------ | ------------------------------------------- |
| Enter the structure            | Activate the "Enter navigation area" button |
| Exit                           | <kbd>Esc</kbd>                              |
| Left (backward along category) | <kbd>←</kbd>                                |
| Right (forward along category) | <kbd>→</kbd>                                |
| Up (backward along metric)     | <kbd>↑</kbd>                                |
| Down (forward along metric)    | <kbd>↓</kbd>                                |
| Drill down to child            | <kbd>Enter</kbd>                            |
| Drill up to parent             | <kbd>W</kbd> or <kbd>J</kbd>                |

</details>

## Simple Example

Press the **Enter navigation area** button below, then use arrow keys to navigate. Watch the focus indicator move through the graph.

<div id="simple-example" style="min-height: 350px;"></div>

<script setup>
import { onMounted } from 'vue';

onMounted(async () => {
    const { default: dataNavigator } = await import('data-navigator');
    const { Inspector } = await import('../src/inspector.js');

    const data = [
        { id: 'a', cat: 'meow', num: 3 },
        { id: 'b', cat: 'meow', num: 1 },
        { id: 'c', cat: 'meow', num: 2 },
        { id: 'd', cat: 'bork', num: 4 }
    ];

    const exitFns = {};

    const structure = dataNavigator.structure({
        data,
        idKey: 'id',
        dimensions: {
            values: [
                {
                    dimensionKey: 'cat',
                    type: 'categorical',
                    behavior: { extents: 'circular' }
                },
                {
                    dimensionKey: 'num',
                    type: 'numerical',
                    behavior: { extents: 'terminal' }
                }
            ]
        },
        genericEdges: [
            {
                edgeId: 'any-exit',
                edge: {
                    source: (_d, c) => c,
                    target: () => {
                        if (exitFns.exit) exitFns.exit();
                        return '';
                    },
                    navigationRules: ['exit']
                }
            }
        ]
    });

    const entryPoint = structure.dimensions[Object.keys(structure.dimensions)[0]].nodeId;

    const inspector = Inspector({
        structure,
        container: 'simple-example',
        size: 300,
        colorBy: 'dimensionLevel',
        entryPoint,
        edgeExclusions: ['any-exit'],
        nodeInclusions: ['exit'],
        dataNavigator
    });
});
</script>
