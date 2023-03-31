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

;// CONCATENATED MODULE: ./src/static-app.js

let scale;
const hideTooltip = () => {
    document.getElementById("tooltip").classList.add("hidden")
}

const showTooltip = e => {
    console.log("showing tooltip",e)
    const tooltip = document.getElementById("tooltip")
    tooltip.classList.remove("hidden")
    tooltip.innerText = e.d.description
    // const xCenter = e.d.x + e.d.width/2
    const bbox = tooltip.getBoundingClientRect()
    const offset = (5 * scale)
    const yOffset = bbox.height + offset
    console.log(e.d.d.team)
    if (!(e.d.d.team === "Manchester United" || e.d.d.team === "Liverpool" || (!e.d.d.team && e.d.d.contest === "BPL"))) {
        tooltip.style.textAlign = "left"
        tooltip.style.transform = `translate(${(e.d.x)*scale-offset+1}px,${(e.d.y)*scale-yOffset}px)`
    } else {
        tooltip.style.textAlign = "right"
        console.log(e.d.x)
        console.log(e.d.width)
        console.log(e.d.x + e.d.width)
        const xOffset = bbox.width
        tooltip.style.transform = `translate(${(e.d.x + e.d.width)*scale+offset-xOffset+1}px,${(e.d.y)*scale-yOffset}px)`
    }
}

let entered;
// input data
// extracted from https://www.highcharts.com/demo/column-stacked
let nodes = {
    title: {
        d: {
            title: 'Major Trophies for some English teams'
        },
        x: 12,
        y: 9,
        width: 686,
        height: 56,
        id: 'title',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'title-legend'],
        description: 'Major Trophies for some English teams'
    },
    legend: {
        d: {
            legend: 'Contests Included: BPL, FA Cup, CL'
        },
        x: 160,
        y: 162,
        width: 398,
        height: 49,
        id: 'legend',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'title-legend', 'legend-y_axis', 'legend-bpl'],
        description: 'Legend. Contests Included: BPL, FA Cup, CL. Press Enter to explore these contests.'
    },
    y_axis: {
        d: {
            'Y Axis': 'Label: Count trophies. Values range from 0 to 30 on a numerical scale.'
        },
        x: 21,
        y: 311,
        width: 39,
        height: 194,
        id: 'y_axis',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'legend-y_axis', 'y_axis-x_axis'],
        description: 'Y Axis. Label: Count trophies. Values range from 0 to 30 on a numerical scale.'
    },
    x_axis: {
        d: {
            'X Axis': 'Teams included: Arsenal, Chelsea, Liverpool, Manchester United.'
        },
        x: 191,
        y: 736,
        width: 969,
        height: 44,
        id: 'x_axis',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'y_axis-x_axis', 'x_axis-arsenal'],
        description: 'X Axis. Arsenal, Chelsea, Liverpool, Manchester United. Press Enter to explore these teams.'
    },
    arsenal: {
        d: {
            team: 'Arsenal',
            'total trophies': 17
        },
        x: 194,
        y: 370,
        width: 122,
        height: 357,
        id: 'arsenal',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'x_axis-arsenal',
            'any-x_axis',
            'arsenal-bpl1',
            'arsenal-chelsea',
            'manchester-arsenal',
            'any-legend'
        ],
        description: describeNode(
            {
                team: 'Arsenal',
                'total trophies': 17,
                contains: '3 contests'
            },
            {}
        )
    },
    chelsea: {
        d: {
            team: 'Chelsea',
            'total trophies': 15
        },
        x: 458,
        y: 414,
        width: 122,
        height: 312,
        id: 'chelsea',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'arsenal-chelsea',
            'chelsea-bpl2',
            'chelsea-liverpool',
            'any-legend'
        ],
        description: describeNode(
            {
                team: 'Chelsea',
                'total trophies': 15,
                contains: '3 contests'
            },
            {}
        )
    },
    liverpool: {
        d: {
            team: 'Liverpool',
            'total trophies': 15
        },
        x: 722,
        y: 414,
        width: 122,
        height: 312,
        id: 'liverpool',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'chelsea-liverpool',
            'liverpool-bpl3',
            'liverpool-manchester',
            'any-legend'
        ],
        description: describeNode(
            {
                team: 'Liverpool',
                'total trophies': 15,
                contains: '3 contests'
            },
            {}
        )
    },
    manchester: {
        d: {
            team: 'Manchester United',
            'total trophies': 28
        },
        x: 986,
        y: 138,
        width: 122,
        height: 589,
        id: 'manchester',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'liverpool-manchester',
            'manchester-bpl4',
            'manchester-arsenal',
            'any-legend'
        ],
        description: describeNode(
            {
                team: 'Manchester',
                'total trophies': 28,
                contains: '3 contests'
            },
            {}
        )
    },
    bpl: {
        d: {
            contest: 'BPL',
            'total trophies': 22
        },
        x: 194,
        y: 138,
        width: 918,
        height: 378,
        path: 'M987 136H985.762L985.21 137.108L848.762 411H720H584H457.309L321.603 368.093L321.309 368H321H196H194V370V430V432H196H320.431L458.948 517.701L459.431 518H460H584H584.579L585.069 517.69L720.579 432H850H850.152L850.303 431.977L987.152 411H1112H1114V409V138V136H1112H987Z',
        id: 'bpl',
        cssClass: 'dn-test-path',
        edges: ['any-return', 'any-exit', 'legend-bpl', 'any-legend', 'bpl-bpl1', 'bpl-fa', 'cl-bpl'],
        description: describeNode(
            {
                contest: 'BPL',
                'total trophies': 22,
                contains: '4 teams'
            },
            {}
        )
    },
    fa: {
        d: {
            contest: 'FA Cup',
            'total trophies': 42
        },
        x: 194,
        y: 414,
        width: 918,
        height: 311,
        path: 'M987.407 412H987.263L987.119 412.021L849.712 432H722.274H721.698L721.211 432.306L586.141 517H459.707L324.059 432.304L323.573 432H323H196H194V434V725V727H196H323H323.288L323.564 726.919L459.421 687H586.717H587.298L587.788 686.689L722.855 601H849.414L986.563 664.813L986.965 665H987.407H1112H1114V663V414V412H1112H987.407Z',
        id: 'fa',
        cssClass: 'dn-test-path',
        edges: ['any-return', 'any-exit', 'any-legend', 'bpl-fa', 'fa-fa1', 'fa-cl'],
        description: describeNode(
            {
                contest: 'FA Cup',
                'total trophies': 42,
                contains: '4 teams'
            },
            {}
        )
    },
    cl: {
        d: {
            contest: 'CL',
            'total trophies': 11
        },
        x: 194,
        y: 609,
        width: 918,
        height: 116,
        path: 'M321.731 723H191V727H322H457H585H721H849H987H1112H1114V725V666V664H1112H987.441L849.841 600.186L849.441 600H849H721H720.421L719.931 600.31L584.421 686H457H456.731L456.471 686.071L321.731 723Z',
        id: 'cl',
        cssClass: 'dn-test-path',
        edges: ['any-return', 'any-exit', 'any-legend', 'fa-cl', 'cl-cl1', 'cl-bpl'],
        description: describeNode(
            {
                contest: 'CL',
                'total trophies': 11,
                contains: '4 teams'
            },
            {}
        )
    },
    bpl1: {
        d: {
            contest: 'BPL',
            team: 'Arsenal',
            trophies: 3
        },
        x: 194,
        y: 370,
        width: 122,
        height: 62,
        id: 'bpl1',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-legend',
            'arsenal-bpl1',
            'bpl-bpl1',
            'bpl1-fa1',
            'cl1-bpl1',
            'bpl1-bpl2',
            'bpl4-bpl1'
        ],
        description: describeNode(
            {
                contest: 'BPL',
                team: 'Arsenal',
                trophies: 3
            },
            {}
        )
    },
    fa1: {
        d: {
            contest: 'FA Cup',
            team: 'Arsenal',
            trophies: 14
        },
        x: 194,
        y: 436,
        width: 122,
        height: 291,
        id: 'fa1',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-legend',
            'arsenal-fa1',
            'fa-fa1',
            'bpl1-fa1',
            'fa1-cl1',
            'fa1-fa2',
            'fa4-fa1'
        ],
        description: describeNode(
            {
                contest: 'FA Cup',
                team: 'Arsenal',
                trophies: 14
            },
            {}
        )
    },
    cl1: {
        d: {
            contest: 'CL',
            team: 'Arsenal',
            trophies: 0
        },
        x: 194,
        y: 727,
        width: 122,
        height: 0,
        id: 'cl1',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'arsenal-cl1',
            'any-legend',
            'cl-cl1',
            'fa1-cl1',
            'cl1-bpl1',
            'cl1-cl2',
            'cl4-cl1'
        ],
        description: describeNode(
            {
                contest: 'CL',
                team: 'Arsenal',
                trophies: 0
            },
            {}
        )
    },
    bpl2: {
        d: {
            contest: 'BPL',
            team: 'Chelsea',
            trophies: 5
        },
        x: 458,
        y: 414,
        width: 122,
        height: 103,
        id: 'bpl2',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-legend',
            'chelsea-bpl2',
            'bpl2-fa2',
            'cl2-bpl2',
            'bpl1-bpl2',
            'bpl2-bpl3'
        ],
        description: describeNode(
            {
                contest: 'BPL',
                team: 'Chelsea',
                trophies: 5
            },
            {}
        )
    },
    fa2: {
        d: {
            contest: 'FA Cup',
            team: 'Chelsea',
            trophies: 8
        },
        x: 458,
        y: 521,
        width: 122,
        height: 165,
        id: 'fa2',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'chelsea-fa2', 'any-exit', 'any-legend', 'bpl2-fa2', 'fa2-cl2', 'fa1-fa2', 'fa2-fa3'],
        description: describeNode(
            {
                contest: 'FA Cup',
                team: 'Chelsea',
                trophies: 8
            },
            {}
        )
    },
    cl2: {
        d: {
            contest: 'CL',
            team: 'Chelsea',
            trophies: 2
        },
        x: 458,
        y: 691,
        width: 122,
        height: 35,
        id: 'cl2',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'chelsea-cl2', 'fa2-cl2', 'cl2-bpl2', 'cl1-cl2', 'cl2-cl3'],
        description: describeNode(
            {
                contest: 'CL',
                team: 'Chelsea',
                trophies: 2
            },
            {}
        )
    },
    bpl3: {
        d: {
            contest: 'BPL',
            team: 'Liverpool',
            trophies: 1
        },
        x: 722,
        y: 414,
        width: 122,
        height: 18,
        id: 'bpl3',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-legend',
            'liverpool-bpl3',
            'bpl3-fa3',
            'cl3-bpl3',
            'bpl2-bpl3',
            'bpl3-bpl4'
        ],
        description: describeNode(
            {
                contest: 'BPL',
                team: 'Liverpool',
                trophies: 1
            },
            {}
        )
    },
    fa3: {
        d: {
            contest: 'FA Cup',
            team: 'Liverpool',
            trophies: 8
        },
        x: 722,
        y: 437,
        width: 122,
        height: 165,
        id: 'fa3',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'liverpool-fa3', 'bpl3-fa3', 'fa3-cl3', 'fa2-fa3', 'fa3-fa4'],
        description: describeNode(
            {
                contest: 'FA Cup',
                team: 'Liverpool',
                trophies: 8
            },
            {}
        )
    },
    cl3: {
        d: {
            contest: 'CL',
            team: 'Liverpool',
            trophies: 6
        },
        x: 722,
        y: 607,
        width: 122,
        height: 119,
        id: 'cl3',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'liverpool-cl3', 'fa3-cl3', 'cl3-bpl3', 'cl2-cl3', 'cl3-cl4'],
        description: describeNode(
            {
                contest: 'CL',
                team: 'Liverpool',
                trophies: 6
            },
            {}
        )
    },
    bpl4: {
        d: {
            contest: 'BPL',
            team: 'Manchester United',
            trophies: 13
        },
        x: 986,
        y: 138,
        width: 122,
        height: 273,
        id: 'bpl4',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-legend',
            'manchester-bpl4',
            'bpl4-fa4',
            'cl4-bpl4',
            'bpl3-bpl4',
            'bpl4-bpl1'
        ],
        description: describeNode(
            {
                contest: 'BPL',
                team: 'Manchester United',
                trophies: 13
            },
            {}
        )
    },
    fa4: {
        d: {
            contest: 'FA Cup',
            team: 'Manchester United',
            trophies: 12
        },
        x: 986,
        y: 414,
        width: 122,
        height: 250,
        id: 'fa4',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'manchester-fa4', 'bpl4-fa4', 'fa4-cl4', 'fa3-fa4', 'fa4-fa1'],
        description: describeNode(
            {
                contest: 'FA Cup',
                team: 'Manchester United',
                trophies: 12
            },
            {}
        )
    },
    cl4: {
        d: {
            contest: 'CL',
            team: 'Manchester United',
            trophies: 3
        },
        x: 986,
        y: 667,
        width: 122,
        height: 58,
        id: 'cl4',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'manchester-cl4', 'fa4-cl4', 'cl4-bpl4', 'cl3-cl4', 'cl4-cl1'],
        description: describeNode(
            {
                contest: 'CL',
                team: 'Manchester United',
                trophies: 3
            },
            {}
        )
    }
};
let edges = {
    'any-legend': {
        source: (_d, current, _previous) => current,
        target: (_d, current, _previous) => {
            const hasParent = !!+current.substring(current.length - 1);
            console.log(
                'hasParent ? current.substring(0,current.length-1) : "legend"',
                hasParent ? current.substring(0, current.length - 1) : 'legend'
            );
            return hasParent ? current.substring(0, current.length - 1) : 'legend';
        },
        type: 'legend'
    },
    'any-x_axis': {
        source: (_d, current, _previous) => current,
        target: 'x_axis',
        type: 'parent'
    },
    'any-return': {
        source: (_d, current, _previous) => current,
        target: (_d, _current, previous) => previous,
        type: 'returnTo'
    },
    'any-exit': {
        source: (_d, current, _previous) => current,
        target: () => {
            dn.exit();
            hideTooltip();
            entered = false
            return '';
        },
        type: 'exit'
    },
    'x_axis-exit': {
        source: 'x_axis',
        target: () => {
            dn.exit();
            hideTooltip();
            return '';
        },
        type: 'exit'
    },
    'x_axis-arsenal': {
        source: 'x_axis',
        target: 'arsenal',
        type: 'child'
    },
    'arsenal-bpl1': {
        source: 'arsenal',
        target: 'bpl1',
        type: 'child'
    },
    'arsenal-fa1': {
        source: 'arsenal',
        target: 'fa1',
        type: 'child'
    },
    'arsenal-cl1': {
        source: 'arsenal',
        target: 'cl1',
        type: 'child'
    },
    'chelsea-fa2': {
        source: 'chelsea',
        target: 'fa2',
        type: 'child'
    },
    'chelsea-cl2': {
        source: 'chelsea',
        target: 'cl2',
        type: 'child'
    },
    'liverpool-fa3': {
        source: 'liverpool',
        target: 'fa3',
        type: 'child'
    },
    'liverpool-cl3': {
        source: 'liverpool',
        target: 'cl3',
        type: 'child'
    },
    'manchester-fa4': {
        source: 'manchester',
        target: 'fa4',
        type: 'child'
    },
    'manchester-cl4': {
        source: 'manchester',
        target: 'cl4',
        type: 'child'
    },
    'arsenal-chelsea': {
        source: 'arsenal',
        target: 'chelsea',
        type: 'team'
    },
    'manchester-arsenal': {
        source: 'manchester',
        target: 'arsenal',
        type: 'team'
    },
    'title-legend': {
        source: 'title',
        target: 'legend',
        type: 'chart'
    },
    'legend-y_axis': {
        source: 'legend',
        target: 'y_axis',
        type: 'chart'
    },
    'legend-bpl': {
        source: 'legend',
        target: 'bpl',
        type: 'child'
    },
    'y_axis-x_axis': {
        source: 'y_axis',
        target: 'x_axis',
        type: 'chart'
    },
    'chelsea-bpl2': {
        source: 'chelsea',
        target: 'bpl2',
        type: 'child'
    },
    'chelsea-liverpool': {
        source: 'chelsea',
        target: 'liverpool',
        type: 'team'
    },
    'liverpool-bpl3': {
        source: 'liverpool',
        target: 'bpl3',
        type: 'child'
    },
    'liverpool-manchester': {
        source: 'liverpool',
        target: 'manchester',
        type: 'team'
    },
    'manchester-bpl4': {
        source: 'manchester',
        target: 'bpl4',
        type: 'child'
    },
    'bpl-bpl1': {
        source: 'bpl',
        target: 'bpl1',
        type: 'child'
    },
    'bpl-fa': {
        source: 'bpl',
        target: 'fa',
        type: 'contest'
    },
    'cl-bpl': {
        source: 'cl',
        target: 'bpl',
        type: 'contest'
    },
    'fa-fa1': {
        source: 'fa',
        target: 'fa1',
        type: 'child'
    },
    'fa-cl': {
        source: 'fa',
        target: 'cl',
        type: 'contest'
    },
    'cl-cl1': {
        source: 'cl',
        target: 'cl1',
        type: 'child'
    },
    'bpl1-fa1': {
        source: 'bpl1',
        target: 'fa1',
        type: 'contest'
    },
    'cl1-bpl1': {
        source: 'cl1',
        target: 'bpl1',
        type: 'contest'
    },
    'bpl1-bpl2': {
        source: 'bpl1',
        target: 'bpl2',
        type: 'team'
    },
    'bpl4-bpl1': {
        source: 'bpl4',
        target: 'bpl1',
        type: 'team'
    },
    'fa1-cl1': {
        source: 'fa1',
        target: 'cl1',
        type: 'contest'
    },
    'fa1-fa2': {
        source: 'fa1',
        target: 'fa2',
        type: 'team'
    },
    'fa4-fa1': {
        source: 'fa4',
        target: 'fa1',
        type: 'team'
    },
    'cl1-cl2': {
        source: 'cl1',
        target: 'cl2',
        type: 'team'
    },
    'cl4-cl1': {
        source: 'cl4',
        target: 'cl1',
        type: 'team'
    },
    'bpl2-fa2': {
        source: 'bpl2',
        target: 'fa2',
        type: 'contest'
    },
    'cl2-bpl2': {
        source: 'cl2',
        target: 'bpl2',
        type: 'contest'
    },
    'bpl2-bpl3': {
        source: 'bpl2',
        target: 'bpl3',
        type: 'team'
    },
    'fa2-cl2': {
        source: 'fa2',
        target: 'cl2',
        type: 'contest'
    },
    'fa2-fa3': {
        source: 'fa2',
        target: 'fa3',
        type: 'team'
    },
    'cl2-cl3': {
        source: 'cl2',
        target: 'cl3',
        type: 'team'
    },
    'bpl3-fa3': {
        source: 'bpl3',
        target: 'fa3',
        type: 'contest'
    },
    'cl3-bpl3': {
        source: 'cl3',
        target: 'bpl3',
        type: 'contest'
    },
    'bpl3-bpl4': {
        source: 'bpl3',
        target: 'bpl4',
        type: 'team'
    },
    'fa3-cl3': {
        source: 'fa3',
        target: 'cl3',
        type: 'contest'
    },
    'fa3-fa4': {
        source: 'fa3',
        target: 'fa4',
        type: 'team'
    },
    'cl3-cl4': {
        source: 'cl3',
        target: 'cl4',
        type: 'team'
    },
    'bpl4-fa4': {
        source: 'bpl4',
        target: 'fa4',
        type: 'contest'
    },
    'cl4-bpl4': {
        source: 'cl4',
        target: 'bpl4',
        type: 'contest'
    },
    'fa4-cl4': {
        source: 'fa4',
        target: 'cl4',
        type: 'contest'
    }
};
let navRules = {
    // user presses arrowright, we are on a node,
    // now we look for edges that have a "team" type
    // if we find one, we look for edges where source !== edge.source
    // if true, we move to edge.target
    // else we keep looking, including across "chart" type
    right: {
        types: ['team'],
        key: 'ArrowRight',
        direction: 1
    },
    // user presses arrowleft, we are on a node,
    // now we look for edges that have a "team" type
    // if we find one, we look for edges where source !== edge.target
    // if true, we move to edge.source
    // else we keep looking, including across "chart" type
    left: {
        types: ['team'],
        key: 'ArrowLeft',
        direction: -1
    },
    down: {
        types: ['contest', 'chart', 'x_axis-exit'],
        key: 'ArrowDown',
        direction: 1
    },
    up: {
        types: ['contest', 'chart'],
        key: 'ArrowUp',
        direction: -1
    },
    child: {
        types: ['child'],
        key: 'Enter',
        direction: 1
    },
    parent: {
        types: ['child'],
        key: 'Backspace',
        direction: -1
    },
    exit: {
        types: ['exit'],
        key: 'Escape',
        direction: 1
    },
    'previous position': {
        types: ['returnTo'],
        key: 'Period',
        direction: 1
    },
    // user presses KeyL, we are on a node,
    // now we look for edges that have a "legend" type
    // if we find one, we look for edges where source !== edge.source
    // if true, we move to edge.target
    // else we keep looking, including across "chart" type
    legend: {
        types: ['legend'],
        key: 'KeyL',
        direction: 1
    }
};
// nodes[x] = {
//     d,
//     x: +rect.getAttribute('x') - 2,
//     y: +rect.getAttribute('y') - 2,
//     width: +rect.getAttribute('width'),
//     height: +rect.getAttribute('height'),
//     ref: "ref-" + x,
//     id: x,
//     cssClass: "dn-test-class",
//     edges,
//     // lr: [left, right], // left/right, left/right arrows
//     // ud: [up, down], // up/down, up/down arrows
//     // fb: [forward, backward], // backward/forward, comma/period
//     // pc: [parent, child], // first parent/first child, escape/enter
//     description: describeNode(d, descriptionOptions),
//     // semantics: "node", //  collection root, list root, list item, menu, button, hyperlink, toggle, multi-select?, search?
// }

// // options for element descriptions
// const descriptionOptions = {
//     omitKeyNames: false,
// }

let buildOptions = {
    data: {
        nodes,
        edges // required
    },
    id: 'data-navigator-schema', // required
    entryPoint: 'title',
    rendering: 'on-demand', // "full"
    manualEventHandling: false, // default is false/undefined
    root: {
        id: 'root',
        cssClass: '',
        width: '100%',
        height: 0
    },
    navigation: navRules,
    hooks: {
        navigation: d => {
            // either a valid keypress is about to trigger navigation (before)
            // or navigation has just finished
            // provide another function to interrupt? hmmm...
            // console.log('navigating', d);
        },
        focus: d => {
            // focus has just finished
            console.log('focus', d);
            showTooltip(d)
        },
        blur: d => {
            // focus has just finished
            // console.log('blur', d);
        },
        selection: d => {
            // selection event has just finished
            // console.log('selection', d);
        },
        keydown: d => {
            // a keydown event has just happened (most expensive hook)
            // console.log('keydown', d);
        },
        pointerClick: d => {
            // the whole nav region has received a click
            // ideally, we could send the previous focus point and maybe an x/y coord for the mouse?
            // console.log('clicked', d);
        }
    }
};

// create data navigator
const dn = dataNavigator(buildOptions);

dn.build();

window.dn = dn;

const handleMovement = ev => {
    console.log("moving",ev)
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
    console.log("direction",direction)
    if (dn.getCurrentFocus() && direction) {
        dn.move(direction);
    }
}
const touchHandler = new Hammer(document.getElementById("root"), {});
touchHandler.get('pinch').set({ enable: false });
touchHandler.get('rotate').set({ enable: false });
touchHandler.get('pan').set({ enable: false });
touchHandler.get('swipe').set({ direction: Hammer.DIRECTION_ALL, velocity: 0.2 });

touchHandler.on('press', ev => {
    // dn.enter()
});
touchHandler.on('pressup', ev => {
    entered = true
    dn.enter();
});
touchHandler.on('swipe', ev => {
    handleMovement(ev)
});


let model;
let isVideo = false;
let ready = false;
let timer;
let command = null;
const video = document.getElementById("feed")
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const modelParams = {
    flipHorizontal: true,
    // outputStride: 16,
    // imageScaleFactor: 1,
    iouThreshold: 0.5,
    scoreThreshold: 0.45,
    modelType: "ssd320fpnlite",
    modelSize: "small",
    // bboxLineWidth: "2",
    // fontSize: 17,
}

const openCam = () => {
    document.getElementById("openWebcam").disabled = true;
    document.getElementById("ready").innerText = "No. Loading video feed..."
    handTrack.startVideo(video).then((status) => {
        console.log("video started", status);
        document.getElementById("ready").innerText = "Feed ready. Close your hand to prepare for gesture commands."
        if (status) {
        //   updateNote.innerText = "Video started. Now tracking";
          isVideo = true;
          document.getElementById("status").classList.remove('hidden')
          document.getElementById("canvas").classList.remove('hidden')
          runDetection();
        } else {
        //   updateNote.innerText = "Please enable video";
        }
    });
}

const runDetection = () => {
    model.detect(video).then((predictions) => {
        if (predictions.length) {
            model.renderPredictions(predictions, canvas, context, video);
            // predictions.forEach(pred => {
            //     attemptCommand(pred)
            // })
        }
        if (isVideo) {
          requestAnimationFrame(runDetection);
        }
      });
}

const closeCam = () => {
    isVideo = false
    handTrack.stopVideo(video);
    document.getElementById("openWebcam").classList.add('hidden')
    document.getElementById("canvas").classList.add('hidden')
    document.getElementById("status").innerText = "Video feed disabled. Model disposed!"
    model.dispose();
}

const setReady = (bbox) => {
    ready = bbox
    document.getElementById("ready").innerText = "Yes!"
}
const setNotReady = () => {
    ready = false
    document.getElementById("ready").innerText = "No."
}
const attemptCommand = (pred) => {
    if (ready) {
        if (pred.label === 'point') {
            console.log("POINT")
            const ev = {
                deltaX: (ready[2] - ready[0]) - (pred.bbox[2] - pred.bbox[0]),
                deltaY: (ready[3] - ready[1]) - (pred.bbox[3] - pred.bbox[1])
            }
            handleMovement(ev)
            setNotReady()
        }
        if (pred.label === 'open' && !entered) {
            console.log("GOIN IN!")
            entered = true
            dn.enter()
            setNotReady()
        } else if (pred.label === 'open' && entered) {
            // console.log("GOIN OUT!")
            // entered = false
            // dn.exit()
            // setNotReady()
            if (dn.getCurrentFocus()) {
                dn.move("child");
                setNotReady()
            }
        }
    } else if (pred.label === 'closed') {
        console.log("NOW READY")
        setReady(pred.bbox)
    }
}


const loadModel = ()=> {
    document.getElementById("loadModel").disabled = true;
    document.getElementById("status").classList.remove("hidden")
    document.getElementById("ready").innerText = "No. Loading model..."
    handTrack.load(modelParams).then((lmodel) => {
        // detect objects in the image.
        model = lmodel;
        console.log(model);
        document.getElementById("openWebcam").disabled = false;
        document.getElementById("ready").innerText = "No. Model loaded but webcam feed required."
    });
}

document.getElementById("loadModel").addEventListener("click",loadModel)
document.getElementById("openWebcam").addEventListener("click",openCam)
document.getElementById("closeWebcam").addEventListener("click",closeCam)

const attemptSubmission = e => {
    console.log("form submission!")
    const command = document.getElementById("textCommand").value.toLowerCase()
    commandHandler(command)
    e.preventDefault()
}

const commandHandler = command => {
    if (navRules[command]) {
        validCommand(command)
        dn.move(command)
    } else if (command === "enter" && !entered) {
        entered = true
        validCommand(command)
        dn.enter()
    } else if (command === "exit" && entered) {
        entered = false
        validCommand(command)
        dn.exit()
        hideTooltip();
    } else {
        invalidCommand(command)
    }
}

const validCommand = command => {
    document.getElementById("alert").classList.remove("alert")
    document.getElementById("alert").innerText = `Command valid. Attempting "${command}."`
}

const invalidCommand = command => {
    document.getElementById("alert").classList.add("alert")
    document.getElementById("alert").innerText = `"${command}" not recognized as a command! Possible commands are: ${commandsList}.`
}

const lowConfidence = command => {
    document.getElementById("alert").classList.add("alert")
    document.getElementById("alert").innerText = `We thought we heard "${command}" but aren't sure. Please try again! Possible commands are: ${commandsList}.`
}


document.getElementById("form").addEventListener("submit",attemptSubmission)

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent

const commands = Object.keys(navRules)
commands.push('enter')
const commandsList = commands.join(', ')

const recognition = new SpeechRecognition();
if (SpeechGrammarList) {
  // SpeechGrammarList is not currently available in Safari, and does not have any effect in any other browser.
  // This code is provided as a demonstration of possible capability. You may choose not to use it.
  const speechRecognitionList = new SpeechGrammarList();
  const grammar = '#JSGF V1.0; grammar colors; public <color> = ' + commands.join(' | ') + ' ;'
  speechRecognitionList.addFromString(grammar, 1);
  recognition.grammars = speechRecognitionList;
}
recognition.continuous = false;
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

const bg = document.querySelector('html');

// const colorHTML= '';
// colors.forEach(function(v, i, a){
//   console.log(v, i);
//   colorHTML += '<span style="background-color:' + v + ';"> ' + v + ' </span>';
// });
// hints.innerHTML = 'Tap/click then say a color to change the background color of the app. Try ' + colorHTML + '.';

const enableSpeech = ()=> {
    recognition.start();
    document.getElementById("alert").classList.remove("alert")
    document.getElementById("alert").innerText = `Ready! Please speak a command.`
}

document.getElementById("enableSpeech").addEventListener("click",enableSpeech)

recognition.onresult = (event) => {
  // The SpeechRecognitionEvent results property returns a SpeechRecognitionResultList object
  // The SpeechRecognitionResultList object contains SpeechRecognitionResult objects.
  // It has a getter so it can be accessed like an array
  // The first [0] returns the SpeechRecognitionResult at the last position.
  // Each SpeechRecognitionResult object contains SpeechRecognitionAlternative objects that contain individual results.
  // These also have getters so they can be accessed like arrays.
  // The second [0] returns the SpeechRecognitionAlternative at position 0.
  // We then return the transcript property of the SpeechRecognitionAlternative object
  const command = event.results[0][0].transcript;
//   bg.style.backgroundColor = color;
  console.log('Result: ' + command);
  console.log('Confidence: ' + event.results[0][0].confidence);
  if (+event.results[0][0].confidence >= 0.65) {
    commandHandler(command)
  } else {
    lowConfidence(command)
  }
}

recognition.onspeechend = function() {
  recognition.stop();
}

recognition.onnomatch = function(event) {
  console.log("I didn't recognise that color.");
}

recognition.onerror = function(event) {
  console.log('Error occurred in recognition: ' + event.error)
}

const setGeometryData = () => {
    // Haven't resized in 100ms!
    const currentWidth = +document.getElementById("chart").getBoundingClientRect().width
    scale = currentWidth / 1200
    const xAdjust = (1200 - currentWidth)/2
    const entryButton = document.querySelector('.dn-entry-button')
    const buttonRect = entryButton.getBoundingClientRect()
    const yAdjust = (+buttonRect.height) / (scale*2) - 9
    const buttonXAdjust = (buttonRect.width*scale*(1/scale) - buttonRect.width*scale)/2
    document.querySelector('.dn-wrapper').style.transform = `scale(${scale}) translate(${-xAdjust}px,${-yAdjust}px)`
    entryButton.style.transform = `scale(${1/scale}) translate(${buttonXAdjust}px,0px)`
}

let resizeTimer;
window.onresize = () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(setGeometryData, 150);
};

setGeometryData()
/******/ })()
;