/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./src/keycodes.js
const keyCodes = {
    parent: 27, // ESCAPE
    child: 13, // ENTER
    select: 32, // SPACEBAR
    nextSibling: 39, // RIGHT ARROW
    previousSibling: 37, // LEFT ARROW
    nextCousin: 40, // DOWN ARROW
    previousCousin: 38, // UP ARROW
    nextCousinAlternate: 190, // PERIOD
    previousCousinAlternate: 188, // COMMA
    shift: 16, // SHIFT
    tab: 9 // TAB
};

const defaultKeyBindings = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    Period: 'forward',
    Comma: 'backward',
    Escape: 'parent',
    Enter: 'child'
};

const defaultDirections = {
    down: {
        keyCode: 'ArrowDown',
        direction: 1
    },
    left: {
        keyCode: 'ArrowLeft',
        direction: -1
    },
    right: {
        keyCode: 'ArrowRight',
        direction: 1
    },
    up: {
        keyCode: 'ArrowUp',
        direction: -1
    },
    backward: {
        keyCode: 'Comma',
        direction: -1
    },
    child: {
        keyCode: 'Enter',
        direction: 1
    },
    parent: {
        keyCode: 'Backspace',
        direction: -1
    },
    forward: {
        keyCode: 'Period',
        direction: 1
    },
    exit: {
        keyCode: 'Escape',
        direction: 1
    }
};

;// CONCATENATED MODULE: ./src/data-navigator.js


const dataNavigator = options => {
    // local variables
    let dn = {};
    let currentFocus = null;
    let previousFocus = null;
    let entryPoint = null;
    let exit = null;
    let keyBindings = defaultKeyBindings;
    let directions = defaultDirections;
    let root = null;
    let structureWrapper = null;

    // local methods
    let handleKeydownInteraction
    let handleFocusInteraction
    let handleBlurInteraction
    
    const buildNode = id => {
        // const options = dn.currentOptions
        const node = document.createElement('figure'); // subject to change based on new props
        node.setAttribute('role', 'figure');
        node.id = id;
        node.classList.add('dn-node');
        const d = options.data.nodes[id];
        handleKeydownInteraction = e => {
            const direction = keyBindings[e.code];
            if (options.hooks && options.hooks.keydown) {
                options.hooks.keydown({
                    e,
                    d,
                    direction
                })
            }
            if (direction) {
                e.preventDefault();
                if (options.hooks && options.hooks.navigationStart) {
                    options.hooks.navigationStart({
                        e,
                        d,
                        direction
                    })
                }
                if (options.hooks && options.hooks.navigation) {
                    options.hooks.navigation({
                        e,
                        d,
                        direction
                    })
                }
                dn.move(direction);
                if (options.hooks && options.hooks.navigationEnd) {
                    options.hooks.navigationEnd({
                        e,
                        d,
                        direction
                    })
                }
            }
        };
        handleFocusInteraction = e => {
            if (options.hooks && options.hooks.focus) {
                options.hooks.focus({
                    e,
                    d
                })
            }
        };
        handleBlurInteraction = (e, d) => {
            // clearStructure()
            if (options.hooks && options.hooks.blue) {
                options.hooks.blue({
                    e,
                    d
                })
            }
        };

        if (d.cssClass) {
            node.classList.add(d.cssClass);
        }
        node.style.width = parseFloat(d.width || '0') + 'px';
        node.style.height = parseFloat(d.height || '0') + 'px';
        node.style.left = parseFloat(d.x || '0') + 'px';
        node.style.top = parseFloat(d.y || '0') + 'px';
        node.setAttribute('tabindex', '-1');
        node.addEventListener('keydown', handleKeydownInteraction);
        node.addEventListener('focus', handleFocusInteraction);
        node.addEventListener('blur', handleBlurInteraction);

        const nodeText = document.createElement('div');
        nodeText.setAttribute('role', 'img'); // subject to change based on new props
        nodeText.classList.add('dn-node-text');
        if (options.showText) {
            nodeText.innerText = d.description;
        }

        nodeText.setAttribute('aria-label', d.description);

        node.appendChild(nodeText);
        if (d.path) {
            const totalWidth = parseFloat(d.width || '0') + parseFloat(d.x || '0') + 10;
            const totalHeight = parseFloat(d.height || '0') + parseFloat(d.y || '0') + 10;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', totalWidth);
            svg.setAttribute('height', totalHeight);
            svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
            svg.style.left = -parseFloat(d.x || 0);
            svg.style.top = -parseFloat(d.y || 0);
            svg.classList.add('dn-node-svg');
            svg.setAttribute('role', 'presentation');
            svg.setAttribute('focusable', 'false');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d.path);
            path.classList.add('dn-node-path');
            svg.appendChild(path);
            node.appendChild(svg);
        }
        structureWrapper.appendChild(node);
        return node;
    };

    const focusNode = id => {
        const node = document.getElementById(id);
        if (node) {
            previousFocus = currentFocus;
            currentFocus = id;
            node.focus();
        }
    };

    const deleteNode = id => {
        const node = document.getElementById(id);
        if (node) {
            node.remove();
        }
    };

    const removeListeners = id => {
        const node = document.getElementById(id);
        if (node) {
            node.removeEventListener('keydown', handleKeydownInteraction);
            node.removeEventListener('focus', handleFocusInteraction);
            node.removeEventListener('blur', handleBlurInteraction);
        }
    }

    const initiateNodeLifeCycle = (newId, oldId) => {
        removeListeners(oldId)
        buildNode(newId);
        focusNode(newId);
        deleteNode(oldId);
    };

    const clearStructure = () => {
        removeListeners(currentFocus)
        deleteNode(currentFocus);
        previousFocus = currentFocus;
        currentFocus = null;
    };

    // exported methods with dn object
    // organized by: get[Current/Previous]Focus, setNavigationKeyBindings, build, move, and then events (hooks)
    dn.getCurrentFocus = () => {
        return currentFocus;
    };

    dn.getPreviousFocus = () => {
        return previousFocus;
    };

    dn.setNavigationKeyBindings = navKeyBindings => {
        if (!navKeyBindings) {
            keyBindings = defaultKeyBindings;
            directions = defaultDirections;
        } else {
            keyBindings = {};
            directions = navKeyBindings;
            Object.keys(navKeyBindings).forEach(direction => {
                const navOption = navKeyBindings[direction];
                keyBindings[navOption.key] = direction;
            });
        }
    };

    dn.build = () => {
        // to-do: remove any elements from previous build? lifecycle stuff?
        // NOTE: the keys are based on insertion order EXCEPT when keys are number-like (or parse to ints)
        // so if someone passes ids in that are "1" or "2", then those go first in numerical order
        if (options.data) {
            if (options.entryPoint) {
                entryPoint = options.entryPoint;
            } else {
                entryPoint = Object.keys(options.data.nodes)[0];
            }
        } else {
            console.error(
                'No data found, cannot enter: options.data must contain a valid hash object of data for dn.build'
            );
            return;
        }
        if (options.root && document.getElementById(options.root.id)) {
            root = document.getElementById(options.root.id);
        } else {
            console.error(
                'No root element found, cannot build: options.root.id must reference an existing DOM element.'
            );
            return;
        }
        root.style.position = 'relative';
        root.classList.add('dn-root');

        if (options.id) {
            // build structureWrapper
            structureWrapper = document.createElement('div');
            structureWrapper.id = 'dn-wrapper-' + options.id;
            structureWrapper.classList.add('dn-wrapper');
            structureWrapper.style.width = options.root && options.root.width ? options.root.width : '100%';
            if (options.root && options.root.height) {
                structureWrapper.style.height = options.root.height;
            }

            // TO-DO: build interaction instructions/menu

            // build entry button
            const entry = document.createElement('button');
            entry.id = 'dn-entry-button-' + options.id;
            entry.classList.add('dn-entry-button');
            entry.innerText = `Enter navigation area`;
            entry.addEventListener('click', dn.enter);
            structureWrapper.appendChild(entry);

            exit = document.createElement('div');

            exit.id = 'dn-exit-' + options.id;
            exit.classList.add('dn-exit-position');
            exit.innerText = `End of data structure.`;
            exit.setAttribute('aria-label', `End of data structure.`);
            exit.setAttribute('role', 'note');
            exit.setAttribute('tabindex', '-1');
            exit.style.display = 'none';
            exit.addEventListener('focus', () => {
                exit.style.display = 'block';
                clearStructure();
            });
            exit.addEventListener('blur', () => {
                exit.style.display = 'none';
            });

            dn.setNavigationKeyBindings(options.navigation);

            // build the whole structure, if props sent

            root.appendChild(structureWrapper);
            root.appendChild(exit);
            return root;
        } else {
            console.error('No id found: options.id must be specified for dataNavigator.build');
            return;
        }
    };

    dn.move = direction => {
        if (currentFocus) {
            const d = options.data.nodes[currentFocus];
            if (d.edges) {
                let target = null;
                let i = 0;
                const x = directions[direction];
                if (!x) {
                    return
                }
                const types = x && x.types ? x.types : direction; // hasNavigationRules.key;
                const verifyEdge = (type, edge) => {
                    if (!(type === edge.type)) {
                        return null;
                    }
                    const t =
                        typeof edge.target === 'string' ? edge.target : edge.target(d, currentFocus, previousFocus);
                    const s =
                        typeof edge.source === 'string' ? edge.source : edge.source(d, currentFocus, previousFocus);
                    const vector = s === currentFocus ? 1 : t === currentFocus ? -1 : 0;
                    const otherID = vector === 1 ? t : vector === -1 ? s : null;
                    return otherID && vector === x.direction ? otherID : null;
                };
                for (i = 0; i < d.edges.length; i++) {
                    const edge = options.data.edges[d.edges[i]];
                    if (Array.isArray(types)) {
                        types.forEach(type => {
                            if (!target) {
                                target = verifyEdge(type, edge);
                            }
                        });
                    } else {
                        target = verifyEdge(types, edge);
                    }
                    if (target) {
                        break;
                    }
                }
                if (target) {
                    initiateNodeLifeCycle(target, currentFocus);
                }
            }
        }
    };
    dn.moveTo = id => {
        const target = document.getElementById(id);
        if (target) {
            previousFocus = currentFocus;
            currentFocus = id;
            target.focus();
        } else {
            initiateNodeLifeCycle(id, currentFocus);
        }
    };

    dn.enter = () => {
        dn.moveTo(entryPoint);
    };

    dn.exit = () => {
        exit.style.display = 'block';
        exit.focus();
    };

    dn.hooks = {};
    dn.hooks.navigation = () => {};
    dn.hooks.focus = () => {};
    dn.hooks.selection = () => {};
    dn.hooks.keydown = () => {};
    dn.hooks.pointerClick = () => {};
    return dn;
};

const describeNode = (d, descriptionOptions) => {
    const keys = Object.keys(d);
    let description = '';
    keys.forEach(key => {
        description += `${descriptionOptions.omitKeyNames ? '' : key + ': '}${d[key]}. `;
    });
    description += descriptionOptions.semanticLabel || 'Data point.';
    return description;
};

const extractStructureFromVegaLite = options => {
    // options = {
    //     vegaLiteView: {}, // required
    //     vegaLiteSpec: {}, // required
    //     groupInclusionCriteria: () => {},
    //     itemInclusionCriteria: () => {},
    //     datumInclusionCriteria: () => {},
    //     nodeDescriber: () => {},
    //     keyRenamingHash: {}
    // }
    let nodes = {};
    let edges = {};
    let total = 0;
    let repeated = 0;

    const includeGroup = options.groupInclusionCriteria ? options.groupInclusionCriteria : () => true;
    const includeItem = options.itemInclusionCriteria ? options.itemInclusionCriteria : () => true;
    const includeDataProperties = options.datumInclusionCriteria ? options.datumInclusionCriteria : () => true;
    const offset = options.vegaLiteView._renderer._origin;
    const groupParent = options.vegaLiteView._scenegraph.root.items[0].mark.items[0];

    const idBuilder = (it, level) => {
        // const item = it.mark || it
        if (it['data-navigator-id']) {
            return it['data-navigator-id'];
        }
        const id = `dn-node-${level}-${total}`; // (item.name || '') + (item.role || '') + (item.marktype || '') + total
        total++;
        it['data-navigator-id'] = id;
        return id;
    };
    const navBuilder = () => {
        return;
    };
    const edgeBuilder = id => {
        const node = nodes[id];
        const index = node.index;
        const level = node.level;
        const parent = node.parent;
        const edgeList = [];
        // previous and next use parent.items[]
        const previous = parent.items[index - 1];
        if (previous) {
            const previousId = idBuilder(previous, level);
            if (nodes[previousId]) {
                const previousEdge = `${previousId}-${node.id}`;
                edgeList.push(previousEdge);
                if (!edges[previousEdge]) {
                    edges[previousEdge] = {
                        source: previousId,
                        target: node.id,
                        type: 'sibling'
                    };
                }
            }
        }
        const next = parent.items[index + 1];
        if (next) {
            const nextId = idBuilder(next, level);
            if (nodes[nextId]) {
                const nextEdge = `${node.id}-${nextId}`;
                edgeList.push(nextEdge);
                if (!edges[nextEdge]) {
                    edges[nextEdge] = {
                        source: node.id,
                        target: nextId,
                        type: 'sibling'
                    };
                }
            }
        }
        if (level === 'group' && parent.items[index].items) {
            const g = parent.items[index].items[0].mark.items[0].items || parent.items[index].items;
            // first child
            const firstChild = g[0];
            const firstChildId = idBuilder(firstChild, 'item');
            if (nodes[firstChildId]) {
                const firstChildEdge = `${node.id}-${firstChildId}`;
                edgeList.push(firstChildEdge);
                if (!edges[firstChildEdge]) {
                    edges[firstChildEdge] = {
                        source: node.id,
                        target: firstChildId,
                        type: 'level'
                    };
                }
            }
        } else if (level === 'item') {
            // parent
            const parentId = idBuilder(parent, 'group');
            if (nodes[parentId]) {
                const parentEdge = `${parentId}-${node.id}`;
                edgeList.push(parentEdge);
                if (!edges[parentEdge]) {
                    edges[parentEdge] = {
                        source: parentId,
                        target: node.id,
                        type: 'level'
                    };
                }
            }
        }
        if (options.exitFunction) {
            edgeList.push('any-exit');
            if (!edges['any-exit']) {
                edges['any-exit'] = {
                    source: (_d, current, _previous) => current,
                    target: options.exitFunction,
                    type: 'exit'
                };
            }
        }
        edgeList.push('any-undo');
        if (!edges['any-undo']) {
            edges['any-undo'] = {
                source: (_d, current, _previous) => current,
                target: (_d, _current, previous) => previous,
                type: 'undo'
            };
        }
        return edgeList;
    };
    const nodeBuilder = (item, level, offset, index, parent) => {
        const id = idBuilder(item, level);
        const o = offset || [0, 0];
        nodes[id] = {};
        nodes[id].d = {};
        nodes[id].id = id;
        nodes[id].x = item.bounds.x1 + o[0];
        nodes[id].y = item.bounds.y1 + o[1];
        nodes[id].width = item.bounds.x2 - item.bounds.x1;
        nodes[id].height = item.bounds.y2 - item.bounds.y1;
        nodes[id].cssClass = 'dn-vega-lite-node';
        nodes[id].index = index;
        nodes[id].level = level;
        nodes[id].parent = parent;
        if (item.datum) {
            Object.keys(item.datum).forEach(key => {
                const value = item.datum[key];
                if (includeDataProperties(key, value, item.datum, level, options.vegaLiteSpec)) {
                    nodes[id].d[
                        options.keyRenamingHash && options.keyRenamingHash[key] ? options.keyRenamingHash[key] : key
                    ] = value;
                }
            });
        }
        nodes[id].description = options.nodeDescriber
            ? options.nodeDescriber(nodes[id].d, item, level)
            : describeNode(nodes[id].d);
    };
    let i = 0;
    const groups = groupParent.items;
    groups.forEach(group => {
        if (includeGroup(group, i, options.vegaLiteSpec)) {
            nodeBuilder(group, 'group', offset, i, groupParent);
            let j = 0;
            const g = group.items[0].mark.items[0].items ? group.items[0].mark.items[0] : group;
            g.items.forEach(item => {
                if (includeItem(item, j, group, options.vegaLiteSpec)) {
                    nodeBuilder(item, 'item', offset, j, g);
                }
                j++;
            });
        }
        i++;
    });
    Object.keys(nodes).forEach(n => {
        nodes[n].edges = edgeBuilder(n);
    });
    return {
        data: {
            nodes,
            edges
        }
    };
};

const transformData = options => {
    // need to convert to a graph structure!
    // https://adrianmejia.com/data-structures-for-beginners-graphs-time-complexity-tutorial/
    // should probably save each item as a hash? array? hmmm....

    // options:
    // {
    //     data: dataUsedInChart,
    //     lrVariable: "series", // left/right
    //     udVariable: "category", // up/down
    //     fbVariable: "group", // back/forward
    //     pcVariable: "level", // parent/child
    //     refVariable: "id", // if an element exists
    //     flow: "sequential", // "circular"
    //     cssClass: "dn-node",
    //     // htmlAddition: "<div class=''></div>",
    //     description: d => { return dn.describe(d, descriptionOptions) }, // by default will throw an error if unspecified
    //     x: "", // if no refVariable, then x can be specified
    //     y: "", // if no refVariable, then y can be specified
    //     width: "", // if no refVariable, then width can be specified
    //     height: "", // if no refVariable, then height can be specified
    //     idPrefix: ""
    // }
    return {};
};

;// CONCATENATED MODULE: ./src/vega-lite-app.js

// import { cars } from './cars.js';
console.log('yo');

let view;
let spec;
let dn;
const groupInclusionCriteria = (item, _i, _spec) => {
    return item.marktype && !(item.marktype === 'text'); // item.marktype !== 'group' && item.marktype !== 'text'
};
const itemInclusionCriteria = (_item, _i, group, _spec) => {
    return !(group.role === 'axis' || group.role === 'legend'); // true
};
const datumInclusionCriteria = (_key, _value, _d, _level, _spec) => {
    return true;
};
const nodeDescriber = (d, item, level) => {
    if (Object.keys(d).length) {
        return describeNode(d, {});
    } else {
        d.role = item.role;
        if (item.role === 'axis') {
            const ticks = item.items[0].items[0].items;
            const type =
                item.items[0].datum.scale === 'yscale' ? 'Y ' : item.items[0].datum.scale === 'xscale' ? 'X ' : '';
            return `${type}Axis. Values range from ${ticks[0].datum.label} to ${ticks[ticks.length - 1].datum.label}.`;
        } else if (item.role === 'mark') {
            return `${item.items.length} navigable data elements. Group. Enter using Enter Key.`;
        } else if (item.role === 'legend') {
            const labels = item.items[0].items[0].items[0].items[0].items;
            return `Legend: ${spec.legends[0].title}. Showing values from ${
                labels[0].items[1].items[0].datum.label
            } to ${labels[labels.length - 1].items[1].items[0].datum.label}.`;
        } else {
            return `${level}.`;
        }
    }
};
const exit = () => {
    dn.exit();
    return '';
};
fetch('https://vega.github.io/vega/examples/scatter-plot.vg.json')
    // fetch('https://vega.github.io/vega/examples/bar-chart.vg.json')
    .then(res => {
        return res.json();
    })
    .then(specification => {
        spec = specification;
        return render(specification);
    })
    .then(v => {
        const dnStructure = extractStructureFromVegaLite({
            vegaLiteView: v,
            vegaLiteSpec: spec,
            groupInclusionCriteria,
            itemInclusionCriteria,
            datumInclusionCriteria,
            keyRenamingHash: {},
            nodeDescriber,
            exitFunction: exit
        });
        const dnBuildOptions = {
            data: {
                nodes: dnStructure.data.nodes,
                edges: dnStructure.data.edges
            },
            navigation: {
                right: {
                    types: ['sibling'],
                    key: 'ArrowRight',
                    direction: 1
                },
                left: {
                    types: ['sibling'],
                    key: 'ArrowLeft',
                    direction: -1
                },
                down: {
                    types: ['level'],
                    key: 'Enter',
                    direction: 1
                },
                up: {
                    types: ['level'],
                    key: 'Backspace',
                    direction: -1
                },
                exit: {
                    types: ['exit'],
                    key: 'Escape',
                    direction: 1
                },
                undo: {
                    types: ['undo'],
                    key: 'Period',
                    direction: 1
                },
                legend: {
                    types: ['legend'],
                    key: 'KeyL',
                    direction: 1
                }
            },
            id: 'data-navigator-schema', // required
            // entryPoint: 'title',
            // rendering: 'on-demand', // "full"
            // manualEventHandling: false, // default is false/undefined
            root: {
                id: 'view',
                cssClass: '',
                width: '100%',
                height: 0
            }
        };
        // we build here
        console.log('dnBuildOptions', dnBuildOptions);
        dn = dataNavigator(dnBuildOptions);
        dn.build();
        window.dn = dn;
        return dnBuildOptions;
    })
    .catch(err => console.error(err));

const render = spec => {
    view = new vega.View(vega.parse(spec), {
        renderer: 'canvas', // renderer (canvas or svg)
        container: '#view', // parent DOM container
        hover: true // enable hover processing
    });
    return view.runAsync();
};

const touchHandler = new Hammer(document.body, {});
touchHandler.get('pinch').set({ enable: false });
touchHandler.get('rotate').set({ enable: false });
touchHandler.get('pan').set({ enable: false });
touchHandler.get('swipe').set({ direction: Hammer.DIRECTION_ALL, velocity: 0.2 });

touchHandler.on('press', ev => {
    // dn.enter()
});
touchHandler.on('pressup', ev => {
    dn.enter();
});
touchHandler.on('swipe', ev => {
    const larger = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? 'X' : 'Y';
    // const smaller = ev.deltaX <= ev.deltaY ? ev.deltaX : ev.deltaY
    const ratio =
        (Math.abs(ev['delta' + larger]) + 0.000000001) /
        (Math.abs(ev['delta' + (larger === 'X' ? 'Y' : 'X')]) + 0.000000001);
    const left = ev.deltaX < 0;
    const right = ev.deltaX > 0;
    const up = ev.deltaY < 0;
    const down = ev.deltaY > 0;
    const direction =
        ratio > 0.99 && ratio <= 2
            ? right && up
                ? 'forward'
                : right && down
                ? 'child'
                : left && down
                ? 'backward'
                : left && up
                ? 'parent'
                : null
            : right && larger === 'X'
            ? 'right'
            : down && larger === 'Y'
            ? 'down'
            : left && larger === 'X'
            ? 'left'
            : up && larger === 'Y'
            ? 'up'
            : null;
    if (dn.getCurrentFocus() && direction) {
        dn.move(direction);
    }
});

/******/ })()
;