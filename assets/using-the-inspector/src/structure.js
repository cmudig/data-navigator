import dataNavigator from 'data-navigator';

export const data = [
    { id: 'a', cat: 'meow', num: 3, selectAll: 'yes' },
    { id: 'b', cat: 'meow', num: 1, selectAll: 'yes' },
    { id: 'c', cat: 'meow', num: 2, selectAll: 'yes' },
    { id: 'd', cat: 'bork', num: 4, selectAll: 'yes' }
];

// The dimensions API automatically builds a multi-level hierarchy.
// 'cat' (categorical) creates divisions grouped by category.
// 'num' (numerical) sorts data points by value.
export const callbacks = { onExit: null };

export const structure = dataNavigator.structure({
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
                    if (callbacks.onExit) callbacks.onExit();
                    return '';
                },
                navigationRules: ['exit']
            }
        }
    ]
});

export const entryPoint = structure.dimensions[
    Object.keys(structure.dimensions)[0]
].nodeId;
