import dataNavigator from 'https://cdn.jsdelivr.net/npm/data-navigator@2.2.0/dist/index.mjs';
import { describeNode } from 'https://cdn.jsdelivr.net/npm/data-navigator@2.2.0/dist/utilities.mjs';
import { plot } from './bokeh.js';

const width = 300;
const height = 300;
const id = 'chart';
let current = null;
let previous = null;

const interactiveData = {
    data: [
        [
            [3, 2.75],
            [0, 0]
        ],
        [
            [3.75, 4],
            [3, 2.75]
        ]
    ],
    indices: {
        fruit: {
            apple: 0,
            banana: 1
        },
        store: {
            a: 0,
            b: 1
        }
    }
};

// begin structure scaffolding

const structure = {
    nodes: {
        _0: {
            id: '_0',
            data: {
                fruit: 'apple',
                store: 'a',
                cost: 3
            },
            edges: ['_0-_1', 'any-exit']
        },
        _1: {
            id: '_1',
            data: {
                fruit: 'banana',
                store: 'a',
                cost: 0.75
            },
            edges: ['_0-_1', '_1-_2', 'any-exit']
        },
        _2: {
            id: '_2',
            data: {
                fruit: 'apple',
                store: 'b',
                cost: 2.75
            },
            edges: ['_1-_2', '_2-_3', 'any-exit']
        },
        _3: {
            id: '_3',
            data: {
                fruit: 'banana',
                store: 'b',
                cost: 1.25
            },
            edges: ['_2-_3', 'any-exit']
        }
    },
    edges: {
        '_0-_1': {
            source: '_0',
            target: '_1',
            navigationRules: ['left', 'right']
        },
        '_1-_2': {
            source: '_1',
            target: '_2',
            navigationRules: ['left', 'right']
        },
        '_2-_3': {
            source: '_2',
            target: '_3',
            navigationRules: ['left', 'right']
        },
        'any-exit': {
            source: (_d, c) => c,
            target: () => {
                exit();
                return '';
            },
            navigationRules: ['exit']
        }
    },
    navigationRules: {
        left: { key: 'ArrowLeft', direction: 'source' }, // moves backward when pressing ArrowLeft on the keyboard
        right: { key: 'ArrowRight', direction: 'target' }, // moves forward when pressing ArrowRight on the keyboard
        exit: { key: 'Escape', direction: 'target' } // exits the structure when pressing Escape on the keyboard
    }
};

// begin rendering scaffolding

const addRenderingProperties = nodes => {
    // we want to loop over all of our nodes:
    Object.keys(nodes).forEach(k => {
        let node = nodes[k];

        if (!node.renderId) {
            node.renderId = node.id;
        }

        node.semantics = {
            label: describeNode(node.data, {})
        };

        // all of our elements will start at 0,0 and be full width/height
        node.spatialProperties = {
            x: -2,
            y: -2,
            width: width,
            height: height
        };
    });
};
addRenderingProperties(structure.nodes);

const rendering = dataNavigator.rendering({
    elementData: structure.nodes,
    defaults: {
        cssClass: 'dn-test-class'
    },
    suffixId: id,
    root: {
        id: id + '-wrapper',
        cssClass: '',
        width: '100%'
    },
    entryButton: {
        include: true,
        callbacks: {
            click: () => {
                enter();
            }
        }
    },
    exitElement: {
        include: true
    }
});

// initialize
plot('chart');
rendering.initialize();

// begin input scaffolding
const exit = () => {
    rendering.exitElement.style.display = 'block';
    input.focus(exitPoint);
    previous = current;
    current = null;
    rendering.remove(previous);
};

const enter = () => {
    const nextNode = input.enter();
    if (nextNode) {
        initiateLifecycle(nextNode);
    }
};

const move = direction => {
    const nextNode = input.move(current, direction);

    if (nextNode) {
        initiateLifecycle(nextNode);
    }
};

const initiateLifecycle = nextNode => {
    // we make a node to turn into an element
    const renderedNode = rendering.render({
        renderId: nextNode.renderId,
        datum: nextNode
    });

    // we add event listeners
    renderedNode.addEventListener('keydown', e => {
        // input has a keydown validator
        const direction = input.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            move(direction); // we need to add this function still
        }
    });

    renderedNode.addEventListener('blur', _e => {});

    renderedNode.addEventListener('focus', _e => {
        const i = interactiveData.indices.fruit[nextNode.data.fruit];
        const d = interactiveData.data[i];
        const target = interactiveData.indices.store[nextNode.data.store];
        const line_color = target ? ['none', '#000000'] : ['#000000', 'none'];
        document.getElementById('chart').innerHTML = '';
        plot('chart', {
            top: d[0],
            bottom: d[1],
            line_color
        });
    });

    // focus the new element, using the renderId for it
    input.focus(nextNode.renderId);

    // set state variables
    previous = current;
    current = nextNode.id;

    // delete the old element
    rendering.remove(previous);
};

const entryPoint =
    structure.nodes[Object.keys(structure.nodes)[0]].id || structure.nodes[Object.keys(structure.nodes)[0]].nodeId;
const exitPoint = rendering.exitElement.id;

const input = dataNavigator.input({
    structure,
    navigationRules: structure.navigationRules,
    entryPoint,
    exitPoint
});
