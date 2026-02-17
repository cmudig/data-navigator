export const chartWidth = 300;
export const chartHeight = 300;

// Lookup table for drawing focus outlines on the correct bar.
export const interactiveData = {
    data: [
        [[3, 2.75], [0, 0]],       // apple: [topValues, bottomValues]
        [[3.75, 4], [3, 2.75]]     // banana: [topValues, bottomValues]
    ],
    indices: {
        fruit: { apple: 0, banana: 1 },
        store: { a: 0, b: 1 }
    }
};

export const callbacks = { onExit: null };

// A simple linked list: 4 data points connected by left/right edges.
//   [_0] ←→ [_1] ←→ [_2] ←→ [_3]
export const structure = {
    nodes: {
        _0: {
            id: '_0', renderId: '_0',
            data: { fruit: 'apple', store: 'a', cost: 3 },
            edges: ['_0-_1', 'any-exit'],
            semantics: { label: 'fruit: apple. store: a. cost: 3. Data point.' },
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
            target: () => { if (callbacks.onExit) callbacks.onExit(); return ''; },
            navigationRules: ['exit']
        }
    },
    navigationRules: {
        left: { key: 'ArrowLeft', direction: 'source' },
        right: { key: 'ArrowRight', direction: 'target' },
        exit: { key: 'Escape', direction: 'target' }
    }
};
