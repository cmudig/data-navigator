import dataNavigator from 'data-navigator';

export const data = [
    { id: 'a', cat: 'meow', num: 3, selectAll: 'yes' },
    { id: 'b', cat: 'meow', num: 1, selectAll: 'yes' },
    { id: 'c', cat: 'meow', num: 2, selectAll: 'yes' },
    { id: 'd', cat: 'bork', num: 4, selectAll: 'yes' }
];

export const structureOptions = {
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
                target: () => '',
                navigationRules: ['exit']
            }
        }
    ]
};

export const structure = dataNavigator.structure(structureOptions);

export const entryPoint = structure.dimensions[
    Object.keys(structure.dimensions)[0]
].nodeId;
