import { default as dataNavigator } from '../src/index.ts';
import { ForceGraph } from './force-graph.js';
import { describeNode } from '../src/utilities.ts';
import { plot } from './bokeh.js';

let exit = {};

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

const convertToArray = (o, include, exclude) => {
    let x = [];
    if (include) {
        include.forEach(i => {
            let n = { id: i };
            x.push(n);
        });
    }
    Object.keys(o).forEach(k => {
        if (exclude) {
            let excluding = false;
            exclude.forEach(e => {
                if (k === e) {
                    excluding = true;
                }
            });
            if (excluding) {
                return;
            }
        }
        x.push(o[k]);
    });
    return x;
};

const addRenderingProperties = (nodes, root, size, showWrapper, useFull) => {
    if (showWrapper) {
        Object.keys(nodes).forEach(k => {
            let node = nodes[k];
            // our rendering engine looks for a "renderId", we will just use our id
            // however, if you have an element that is already rendered (like SVG),
            // then you can use that id, and then use "node.existingElement" api
            if (!node.renderId) {
                node.renderId = node.id;
            }
            // our main job to make this navigation experience accessible, so
            // we need to have semantics, which means we need a descriptive label

            node.semantics = {
                label: describeNode(node.data, {})
            };

            node.spatialProperties = {
                x: -2,
                y: -2,
                width: size,
                height: size
            };
        });
    } else if (useFull) {
        Object.keys(nodes).forEach(k => {
            let node = nodes[k];
            if (!node.renderId) {
                node.renderId = node.id;
            }
            let label = '';
            node.existingElement = {
                useForSpatialProperties: true,
                spatialProperties: () => {
                    let box = document
                        .getElementById(root)
                        .querySelector('#svg' + node.renderId)
                        .getBBox();
                    return {
                        x: box.x + size / 2 - 0.91,
                        y: box.y + size / 2 - 0.91,
                        width: box.width,
                        height: box.height
                    };
                }
            };
            if (!node.derivedNode) {
                label = describeNode(node.data, {});
            } else {
                if (node.data.dimensionKey) {
                    // dimension
                    let count = 0;
                    let divisions = Object.keys(node.data.divisions);
                    if (divisions.length) {
                        divisions.forEach(div => {
                            count += Object.keys(node.data.divisions[div].values).length;
                        });
                    }
                    label = `${node.derivedNode}.`;
                    label +=
                        divisions.length && count
                            ? ` Contains ${divisions.length} division${
                                  divisions.length > 1 ? 's' : ''
                              } which contain ${count} datapoint${count > 1 ? 's' : ''} total.`
                            : ' Contains no child data points.';
                    label += ` ${node.data.type} dimension.`;
                } else {
                    // division
                    label = `${node.derivedNode}: ${node.data[node.derivedNode]}. Contains ${
                        Object.keys(node.data.values).length
                    } child data point${Object.keys(node.data.values).length > 1 ? 's' : ''}. Division of ${
                        node.derivedNode
                    } dimension.`;
                }
            }
            node.semantics = {
                label
            };
        });
    } else {
        Object.keys(nodes).forEach(k => {
            let node = nodes[k];
            // our rendering engine looks for a "renderId", we will just use our id
            // however, if you have an element that is already rendered (like SVG),
            // then you can use that id, and then use "node.existingElement" api
            if (!node.renderId) {
                node.renderId = node.id;
            }

            // our main job to make this navigation experience accessible, so
            // we need to have semantics, which means we need a descriptive label

            node.semantics = {
                label: describeNode(node.data, {})
            };
        });
    }
};

const createRenderer = (structure, id, enter, interactivePlot) => {
    return dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: {
            cssClass: !interactivePlot ? 'dn-test-class' : 'dn-manual-focus-node'
        },
        suffixId: 'data-navigator-schema-' + id,
        root: {
            id: id + '-wrapper',
            cssClass: '',
            width: '100%',
            height: 0
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
};

const hideTooltip = (id, hideIndicator) => {
    document.getElementById(id + '-tooltip').classList.add('hidden');
    if (hideIndicator) {
        document.getElementById(id + '-focus-indicator').classList.add('hidden');
    }
};

const showTooltip = (d, id, size, coloredBy, showIndicator) => {
    const tooltip = document.getElementById(id + '-tooltip');
    tooltip.classList.remove('hidden');
    tooltip.innerText =
        d.semantics?.label ||
        `${d.id}${d.data?.[coloredBy] ? ', ' + d.data[coloredBy] : ''} (generic node, edges hidden).`;
    const bbox = tooltip.getBoundingClientRect();
    // const offset = bbox.width / 2;
    const yOffset = bbox.height / 2;
    tooltip.style.textAlign = 'left';
    tooltip.style.transform = `translate(${size + 1}px,${size / 2 - yOffset}px)`;
    if (showIndicator) {
        const svg = document.getElementById(id + '-wrapper').parentNode.parentNode.querySelector('svg');
        let indicator = document.getElementById(id + '-focus-indicator');
        if (!indicator) {
            indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            indicator.id = id + '-focus-indicator';
            indicator.setAttribute('class', 'dn-focus-indicator hidden');
            indicator.setAttribute('cx', 0);
            indicator.setAttribute('cy', 0);
            indicator.setAttribute('r', 6.5);
            indicator.setAttribute('fill', 'none');
            indicator.setAttribute('stroke', '#000');
            indicator.setAttribute('stroke-width', '2');
            svg.appendChild(indicator);
        }
        let target = svg.querySelector('#svg' + d.renderId);
        indicator.setAttribute('cx', target.getAttribute('cx'));
        indicator.setAttribute('cy', target.getAttribute('cy'));
        indicator.classList.remove('hidden');
    }
};

const initializeDataNavigator = (structure, rootId, entryPoint, size, colorBy, interactivePlot) => {
    let previous;
    let current;

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

    exit[rootId] = () => {
        rendering.exitElement.style.display = 'block';
        input.focus(rendering.exitElement.id);
        previous = current;
        current = null;
        rendering.remove(previous);
    };

    const rendering = createRenderer(structure, rootId, enter, interactivePlot);
    rendering.initialize();
    const input = dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint,
        exitPoint: rendering.exitElement.id
    });

    const initiateLifecycle = nextNode => {
        // should we remove existing nodes?

        const renderedNode = rendering.render({
            renderId: nextNode.renderId,
            datum: nextNode
        });
        renderedNode.addEventListener('keydown', e => {
            const direction = input.keydownValidator(e);
            if (direction) {
                e.preventDefault();
                move(direction);
            }
        });
        renderedNode.addEventListener('blur', _e => {
            hideTooltip(rootId, true);
        });
        renderedNode.addEventListener('focus', _e => {
            showTooltip(nextNode, rootId, size, colorBy, true);
            if (interactivePlot) {
                const i = interactiveData.indices.fruit[nextNode.data.fruit];
                const d = interactiveData.data[i];
                const target = interactiveData.indices.store[nextNode.data.store];
                const line_color = target ? ['none', '#000000'] : ['#000000', 'none'];
                document.getElementById('wrappedIndicatorChart').innerHTML = '';
                plot('wrappedIndicatorChart', {
                    top: d[0],
                    bottom: d[1],
                    line_color
                });
            }
        });
        input.focus(nextNode.renderId);
        previous = current;
        current = nextNode.id;
        rendering.remove(previous);
    };
};

const buildGraph = (
    structure,
    rootId,
    size,
    colorBy,
    entryPoint,
    inclusions,
    exclusions,
    disableRenderer,
    hideEdges,
    showWrapper,
    useFull
) => {
    addRenderingProperties(structure.nodes, rootId, size, showWrapper, useFull);

    let graph = ForceGraph(
        {
            nodes: convertToArray(structure.nodes, inclusions),
            links: convertToArray(structure.edges, [], exclusions)
        },
        {
            nodeId: d => d.id,
            nodeGroup: d => (colorBy === 'dimensionLevel' ? d.dimensionLevel : d.data?.[colorBy]),
            width: size,
            linkStrokeOpacity: !hideEdges ? 0.75 : 0,
            height: size
        }
    );
    document.getElementById(rootId).appendChild(graph);
    document
        .getElementById(rootId)
        .querySelectorAll('circle')
        .forEach(c => {
            c.id = 'svg' + c.__data__?.id;
            c.addEventListener('mousemove', e => {
                if (e.target?.__data__?.id) {
                    let d = e.target.__data__;
                    showTooltip(structure.nodes[d.id] || d, rootId, size, colorBy);
                }
            });
            c.addEventListener('mouseleave', () => {
                hideTooltip(rootId);
            });
        });

    if (!disableRenderer) {
        initializeDataNavigator(structure, rootId, entryPoint, size, colorBy);
    }
};

const data = [
    {
        fruit: 'apple',
        store: 'a',
        cost: 3
    },
    {
        fruit: 'banana',
        store: 'a',
        cost: 0.75
    },
    {
        fruit: 'apple',
        store: 'b',
        cost: 2.75
    },
    {
        fruit: 'banana',
        store: 'b',
        cost: 1.25
    }
];
plot('slot1');

let nodesOnlyStructure = {
    nodes: {
        _0: {
            id: '_0',
            data: {
                fruit: 'apple',
                store: 'a',
                cost: 3
            },
            edges: ['_0-_1']
        },
        _1: {
            id: '_1',
            data: {
                fruit: 'banana',
                store: 'a',
                cost: 0.75
            },
            edges: ['_0-_1', '_1-_2']
        },
        _2: {
            id: '_2',
            data: {
                fruit: 'apple',
                store: 'b',
                cost: 2.75
            },
            edges: ['_1-_2', '_2-_3']
        },
        _3: {
            id: '_3',
            data: {
                fruit: 'banana',
                store: 'b',
                cost: 1.25
            },
            edges: ['_2-_3']
        }
    },
    edges: {
        '_0-_1': {
            source: '_0',
            target: '_1'
        },
        '_1-_2': {
            source: '_1',
            target: '_2'
        },
        '_2-_3': {
            source: '_2',
            target: '_3'
        }
    },
    navigationRules: {
        left: { key: 'ArrowLeft', direction: 'source' },
        right: { key: 'ArrowRight', direction: 'target' },
        exit: { key: 'Escape', direction: 'target' }
    }
};
buildGraph(
    nodesOnlyStructure,
    'nodesOnly',
    300,
    'dimensionLevel', // 'cat',
    nodesOnlyStructure.nodes[Object.keys(nodesOnlyStructure.nodes)[0]].id,
    [],
    [],
    true,
    true
);

buildGraph(
    nodesOnlyStructure,
    'basicList',
    300,
    'dimensionLevel', // 'cat',
    nodesOnlyStructure.nodes[Object.keys(nodesOnlyStructure.nodes)[0]].id,
    [],
    [],
    true
);

Object.keys(nodesOnlyStructure.nodes).forEach(nodeId => {
    nodesOnlyStructure.nodes[nodeId].edges.push('any-exit');
});

nodesOnlyStructure.edges['any-exit'] = {
    source: (_d, c) => c,
    target: () => {
        exit['chart']();
        return '';
    },
    navigationRules: ['exit']
};

buildGraph(
    nodesOnlyStructure,
    'listWithExit',
    300,
    'dimensionLevel', // 'cat',
    nodesOnlyStructure.nodes[Object.keys(nodesOnlyStructure.nodes)[0]].id,
    ['exit'],
    ['any-exit'],
    true
);

plot('chart');

Object.keys(nodesOnlyStructure.edges).forEach(edgeId => {
    if (edgeId !== 'any-exit') {
        nodesOnlyStructure.edges[edgeId].navigationRules = ['left', 'right'];
    }
});
initializeDataNavigator(
    nodesOnlyStructure,
    'chart',
    nodesOnlyStructure.nodes[Object.keys(nodesOnlyStructure.nodes)[0]].id,
    300,
    'dimensionLevel'
);

buildGraph(
    nodesOnlyStructure,
    'enterExitOnly',
    300,
    'dimensionLevel', // 'cat',
    nodesOnlyStructure.nodes[Object.keys(nodesOnlyStructure.nodes)[0]].id,
    ['exit'],
    ['any-exit'],
    true
);

plot('focusIndicatorChart');

const oneSpatialNode = {
    nodes: {
        _0: {
            id: '_0',
            data: {
                fruit: 'apple',
                store: 'a',
                cost: 3
            },
            edges: ['_0-_1', 'any-exit'],
            renderId: '_0',
            semantics: {
                label: 'fruit: apple. store: a. cost: 3. Data point.'
            }
        },
        _1: {
            id: '_1',
            data: {
                fruit: 'banana',
                store: 'a',
                cost: 0.75
            },
            edges: ['_0-_1', '_1-_2', 'any-exit'],
            renderId: '_1',
            semantics: {
                label: 'fruit: banana. store: a. cost: 0.75. Data point.'
            },
            spatialProperties: {
                height: 33.545448303222656,
                width: 110.3,
                x: 32,
                y: 103.7727279663086
            }
        },
        _2: {
            id: '_2',
            data: {
                fruit: 'apple',
                store: 'b',
                cost: 2.75
            },
            edges: ['_1-_2', '_2-_3', 'any-exit'],
            renderId: '_2',
            semantics: {
                label: 'fruit: apple. store: b. cost: 2.75. Data point.'
            }
        },
        _3: {
            id: '_3',
            data: {
                fruit: 'banana',
                store: 'b',
                cost: 1.25
            },
            edges: ['_2-_3', 'any-exit'],
            renderId: '_3',
            semantics: {
                label: 'fruit: banana. store: b. cost: 1.25. Data point.'
            }
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
                exit['focusIndicatorChart']();
                return '';
            },
            navigationRules: ['exit']
        }
    },
    navigationRules: {
        left: {
            key: 'ArrowLeft',
            direction: 'source'
        },
        right: {
            key: 'ArrowRight',
            direction: 'target'
        },
        exit: {
            key: 'Escape',
            direction: 'target'
        }
    }
};

initializeDataNavigator(
    oneSpatialNode,
    'focusIndicatorChart',
    oneSpatialNode.nodes[Object.keys(oneSpatialNode.nodes)[0]].id,
    300,
    'dimensionLevel'
);

buildGraph(
    oneSpatialNode,
    'focusIndicator',
    300,
    'dimensionLevel', // 'cat',
    oneSpatialNode.nodes[Object.keys(oneSpatialNode.nodes)[0]].id,
    ['exit'],
    ['any-exit'],
    true
);

plot('wrappedIndicatorChart');

const wrappedSpatialStrategy = {
    nodes: {
        _0: {
            id: '_0',
            data: {
                fruit: 'apple',
                store: 'a',
                cost: 3
            },
            edges: ['_0-_1', 'any-exit'],
            renderId: '_0',
            semantics: {
                label: 'fruit: apple. store: a. cost: 3. Data point.'
            }
        },
        _1: {
            id: '_1',
            data: {
                fruit: 'banana',
                store: 'a',
                cost: 0.75
            },
            edges: ['_0-_1', '_1-_2', 'any-exit'],
            renderId: '_1',
            semantics: {
                label: 'fruit: banana. store: a. cost: 0.75. Data point.'
            },
            spatialProperties: {
                height: 33.545448303222656,
                width: 110.3,
                x: 32,
                y: 103.7727279663086
            }
        },
        _2: {
            id: '_2',
            data: {
                fruit: 'apple',
                store: 'b',
                cost: 2.75
            },
            edges: ['_1-_2', '_2-_3', 'any-exit'],
            renderId: '_2',
            semantics: {
                label: 'fruit: apple. store: b. cost: 2.75. Data point.'
            }
        },
        _3: {
            id: '_3',
            data: {
                fruit: 'banana',
                store: 'b',
                cost: 1.25
            },
            edges: ['_2-_3', 'any-exit'],
            renderId: '_3',
            semantics: {
                label: 'fruit: banana. store: b. cost: 1.25. Data point.'
            }
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
                exit['wrappedIndicatorChart']();
                return '';
            },
            navigationRules: ['exit']
        }
    },
    navigationRules: {
        left: {
            key: 'ArrowLeft',
            direction: 'source'
        },
        right: {
            key: 'ArrowRight',
            direction: 'target'
        },
        exit: {
            key: 'Escape',
            direction: 'target'
        }
    }
};

initializeDataNavigator(
    wrappedSpatialStrategy,
    'wrappedIndicatorChart',
    wrappedSpatialStrategy.nodes[Object.keys(wrappedSpatialStrategy.nodes)[0]].id,
    300,
    'dimensionLevel',
    true
);

buildGraph(
    wrappedSpatialStrategy,
    'wrappedIndicator',
    300,
    'dimensionLevel', // 'cat',
    wrappedSpatialStrategy.nodes[Object.keys(wrappedSpatialStrategy.nodes)[0]].id,
    ['exit'],
    ['any-exit'],
    true,
    false,
    true
);
