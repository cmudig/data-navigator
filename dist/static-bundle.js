/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 772:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "SC": () => (/* binding */ GenericLimitedNavigationRules),
/* harmony export */   "YY": () => (/* binding */ NodeElementDefaults),
/* harmony export */   "_4": () => (/* binding */ defaultKeyBindings),
/* harmony export */   "vx": () => (/* binding */ GenericFullNavigationRules)
/* harmony export */ });
/* unused harmony export keyCodes */
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

const GenericFullNavigationRules = {
    down: {
        keyCode: 'ArrowDown',
        direction: 'target'
    },
    left: {
        keyCode: 'ArrowLeft',
        direction: 'source'
    },
    right: {
        keyCode: 'ArrowRight',
        direction: 'target'
    },
    up: {
        keyCode: 'ArrowUp',
        direction: 'source'
    },
    backward: {
        keyCode: 'Comma',
        direction: 'source'
    },
    child: {
        keyCode: 'Enter',
        direction: 'target'
    },
    parent: {
        keyCode: 'Backspace',
        direction: 'source'
    },
    forward: {
        keyCode: 'Period',
        direction: 'target'
    },
    exit: {
        keyCode: 'Escape',
        direction: 'target'
    }
};

const GenericLimitedNavigationRules = {
    right: {
        key: 'ArrowRight',
        direction: 'target'
    },
    left: {
        key: 'ArrowLeft',
        direction: 'source'
    },
    down: {
        key: 'ArrowDown',
        direction: 'target'
    },
    up: {
        key: 'ArrowUp',
        direction: 'source'
    },
    child: {
        key: 'Enter',
        direction: 'target'
    },
    parent: {
        key: 'Backspace',
        direction: 'source'
    },
    exit: {
        key: 'Escape',
        direction: 'target'
    },
    undo: {
        key: 'Period',
        direction: 'target'
    },
    legend: {
        key: 'KeyL',
        direction: 'target'
    }
}

const NodeElementDefaults = {
    cssClass: '',
    dimensions: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        path: ''
    },
    semantics: {
        label: '',
        elementType: 'div',
        role: 'image',
        attributes: undefined
    },
    parentSemantics: {
        label: '',
        elementType: 'figure',
        role: 'figure',
        attributes: undefined
    },
    existingElement: {
        useForDimensions: false,
        dimensions: undefined
    }
};


/***/ }),

/***/ 641:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "A": () => (/* binding */ dataNavigator)
/* harmony export */ });
/* unused harmony export stateHandler */
/* harmony import */ var _structure__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(36);
/* harmony import */ var _input__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(674);
/* harmony import */ var _rendering__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(949);




const stateHandler = stateOptions => {
    let currentFocus;
    let previousFocus;
    dn.getCurrentFocus = () => {
        return currentFocus;
    };

    dn.getPreviousFocus = () => {
        return previousFocus;
    };
};

const dataNavigator = {
    structure: _structure__WEBPACK_IMPORTED_MODULE_0__/* .structure */ .Fh,
    input: _input__WEBPACK_IMPORTED_MODULE_1__/* .input */ .q,
    rendering: _rendering__WEBPACK_IMPORTED_MODULE_2__/* .rendering */ .n
};

// {
//     data: {
//         nodes,
//         edges // required
//     },
//     entryPoint: 'title',
//     id: 'data-navigator-schema', // required
//     rendering: 'on-demand', // "full"
//     manualEventHandling: false, // default is false/undefined
//     root: {
//         id: 'root',
//         cssClass: '',
//         width: '100%',
//         height: 0
//     },
//     navigation: navRules,
//     hooks: {}
// }
// --------------------------
// New stuff:
//
// the navigation abstraction
// (the graph i.e. nodes and edges, and navigation rules), the input abstraction
// (dn.move()), and the rendering / overlay abstraction (x / y / width / height /
// path).

// structure = dn.structure({
//     data: [],
//     ...options
// })

// input = dn.input({
//     structure,
//     rules: {},
//     entryPoint: "",
//     exitPoint: ""
// })

// rendering = dn.rendering({
//     elementData: {},
//     defaults: (elementData, visualElement) => {} || {
//         dimensions: {
//             x: () => {},
//             y: {},
//             width: {},
//             height: {},
//             path: ""
//         },
//         cssClass: "",
//         semantics: {
//             label: "",
//             elementType: {},
//             attributes: {}
//         },
//         parentSemantics: {
//             includeWrapper: bool,
//             label: "",
//             elementType: "",
//             attributes: {}
//         },
//         visualId: ""
//     },
//     id: 'data-navigator-schema', // what is this?
//     rootStyling: {
//         cssClass: '',
//         width: '100%',
//         height: 0
//     }
// })


/***/ }),

/***/ 674:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "q": () => (/* binding */ input)
/* harmony export */ });
/* harmony import */ var _consts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(772);


const input = InputOptions => {
    let options = { ...InputOptions };
    let inputHandler = {};
    let keyBindings = _consts__WEBPACK_IMPORTED_MODULE_0__/* .defaultKeyBindings */ ._4;
    let directions = _consts__WEBPACK_IMPORTED_MODULE_0__/* .GenericFullNavigationRules */ .vx;

    inputHandler.moveTo = id => {
        // console.log('moveTo', id);
        const target = options.structure.nodes[id];
        // console.log('target', target);
        if (target) {
            return target;
        }
        return;
    };
    inputHandler.move = (currentFocus, direction) => {
        if (currentFocus) {
            const d = options.structure.nodes[currentFocus];
            if (d.edges) {
                let target = null;
                let i = 0;
                const navRule = directions[direction];
                if (!navRule) {
                    return;
                }
                const findTarget = (rule, edge) => {
                    if (!(rule === direction)) {
                        return null;
                    }
                    let resolvedNodes = {};
                    resolvedNodes.target =
                        typeof edge.target === 'string' ? edge.target : edge.target(d, currentFocus);
                    resolvedNodes.source =
                        typeof edge.source === 'string' ? edge.source : edge.source(d, currentFocus);
                    return !(resolvedNodes[navRule.direction] === currentFocus) ? resolvedNodes[navRule.direction] : null;
                };
                for (i = 0; i < d.edges.length; i++) {
                    const edge = options.structure.edges[d.edges[i]];
                    // if (Array.isArray(types)) {
                    edge.navigationRules.forEach(rule => {
                        if (!target) {
                            target = findTarget(rule, edge);
                        }
                    });
                    // } else {
                    //     target = verifyEdge(types, edge);
                    // }
                    if (target) {
                        break;
                    }
                }
                if (target) {
                    return inputHandler.moveTo(target);
                }
                return undefined;
            }
        }
    };
    inputHandler.enter = () => {
        if (options.entryPoint) {
            return inputHandler.moveTo(options.entryPoint);
        } else {
            console.error('No entry point was specified in InputOptions, returning undefined');
            return;
        }
    };
    inputHandler.exit = () => {
        if (options.exitPoint) {
            return options.exitPoint;
        } else {
            console.error('No exit point was specified in InputOptions, returning undefined');
            return;
        }
    };
    inputHandler.keydownValidator = e => {
        const direction = keyBindings[e.code];
        if (direction) {
            return direction;
        }
    };
    inputHandler.focus = renderId => {
        const node = document.getElementById(renderId);
        if (node) {
            node.focus();
        }
    };
    inputHandler.setNavigationKeyBindings = navKeyBindings => {
        if (!navKeyBindings) {
            keyBindings = _consts__WEBPACK_IMPORTED_MODULE_0__/* .defaultKeyBindings */ ._4;
            directions = _consts__WEBPACK_IMPORTED_MODULE_0__/* .GenericFullNavigationRules */ .vx;
        } else {
            keyBindings = {};
            directions = navKeyBindings;
            Object.keys(navKeyBindings).forEach(direction => {
                const navOption = navKeyBindings[direction];
                keyBindings[navOption.key] = direction;
            });
        }
    };

    inputHandler.setNavigationKeyBindings(options.navigationRules);
    return inputHandler;
};


/***/ }),

/***/ 949:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "n": () => (/* binding */ rendering)
/* harmony export */ });
/* harmony import */ var _consts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(772);


const rendering = RenderingOptions => {
    let options = { ...RenderingOptions };
    let renderer = {};
    let initialized = false;
    let defaults = {
        cssClass: _consts__WEBPACK_IMPORTED_MODULE_0__/* .NodeElementDefaults.cssClass */ .YY.cssClass,
        dimensions: { ..._consts__WEBPACK_IMPORTED_MODULE_0__/* .NodeElementDefaults.dimensions */ .YY.dimensions },
        semantics: { ..._consts__WEBPACK_IMPORTED_MODULE_0__/* .NodeElementDefaults.semantics */ .YY.semantics },
        parentSemantics: { ..._consts__WEBPACK_IMPORTED_MODULE_0__/* .NodeElementDefaults.parentSemantics */ .YY.parentSemantics },
        existingElement: { ..._consts__WEBPACK_IMPORTED_MODULE_0__/* .NodeElementDefaults.existingElement */ .YY.existingElement }
    };
    if (options.defaults) {
        defaults.cssClass = options.defaults.cssClass || defaults.cssClass;
        defaults.dimensions = options.defaults.dimensions
            ? { ...defaults.dimensions, ...options.defaults.dimensions }
            : defaults.dimensions;
        defaults.semantics = options.defaults.semantics
            ? { ...defaults.semantics, ...options.defaults.semantics }
            : defaults.semantics;
        defaults.parentSemantics = options.defaults.parentSemantics
            ? { ...defaults.parentSemantics, ...options.defaults.parentSemantics }
            : defaults.parentSemantics;
        defaults.existingElement = options.defaults.existingElement
            ? { ...defaults.existingElement, ...options.defaults.existingElement }
            : defaults.existingElement;
    }
    renderer.initialize = () => {
        if (initialized) {
            console.error(
                `The renderer wrapper has already been initialized successfully, RenderingOptions.suffixId is: ${options.suffixId}. No further action was taken.`
            );
            return;
        }
        if (options.root && document.getElementById(options.root.id)) {
            renderer.root = document.getElementById(options.root.id);
        } else {
            console.error(
                'No root element found, cannot build: RenderingOptions.root.id must reference an existing DOM element in order to render children.'
            );
            return;
        }
        renderer.root.style.position = 'relative';
        renderer.root.classList.add('dn-root');
        if (!options.suffixId) {
            console.error('No suffix id found: options.suffixId must be specified.');
            return;
        }
        // build renderer.wrapper
        renderer.wrapper = document.createElement('div');
        renderer.wrapper.id = 'dn-wrapper-' + options.suffixId;
        renderer.wrapper.classList.add('dn-wrapper');
        renderer.wrapper.style.width = options.root && options.root.width ? options.root.width : '100%';
        if (options.root && options.root.height) {
            renderer.wrapper.style.height = options.root.height;
        }

        // TO-DO: build interaction instructions/menu

        // build entry button
        if (options.entryButton && options.entryButton.include) {
            renderer.entryButton = document.createElement('button');
            renderer.entryButton.id = 'dn-entry-button-' + options.suffixId;
            renderer.entryButton.classList.add('dn-entry-button');
            renderer.entryButton.innerText = `Enter navigation area`;
            if (options.entryButton.callbacks && options.entryButton.callbacks.pressed) {
                renderer.entryButton.addEventListener('click', options.entryButton.callbacks.pressed);
            }
            if (options.entryButton.callbacks && options.entryButton.callbacks.focus) {
                renderer.entryButton.addEventListener('focus', options.entryButton.callbacks.focus);
            }
            renderer.wrapper.appendChild(renderer.entryButton);
        }

        root.appendChild(renderer.wrapper);

        if (options.renderAll) {
            console.warn(
                'Apologies, up front rendering of all node elements is not currently enabled in this version of Data Navigator. Please consider opening a PR on our Github to enable this capability. Initializing is continuing without rendering nodes...'
            );
        }

        if (options.exitElement && options.exitElement.include) {
            renderer.exitElement = document.createElement('div');
            renderer.exitElement.id = 'dn-exit-' + options.suffixId;
            renderer.exitElement.classList.add('dn-exit-position');
            renderer.exitElement.innerText = `End of data structure.`;
            renderer.exitElement.setAttribute('aria-label', `End of data structure.`);
            renderer.exitElement.setAttribute('role', 'note');
            renderer.exitElement.setAttribute('tabindex', '-1');
            renderer.exitElement.style.display = 'none';
            renderer.exitElement.addEventListener('focus', e => {
                // console.log("focused!",renderer.exitElement)
                renderer.exitElement.style.display = 'block';
                renderer.clearStructure();
                if (options.exitElement.callbacks && options.exitElement.callbacks.focus) {
                    options.exitElement.callbacks.focus(e);
                }
            });
            renderer.exitElement.addEventListener('blur', e => {
                renderer.exitElement.style.display = 'none';
                if (options.exitElement.callbacks && options.exitElement.callbacks.blur) {
                    options.exitElement.callbacks.blur(e);
                }
            });

            root.appendChild(renderer.exitElement);
        }
        initialized = true;
        return root;
    };
    renderer.render = nodeData => {
        const id = nodeData.renderId;
        let d = options.elementData[id];
        if (!d) {
            console.warn(`Render data not found with renderId: ${id}. Failed to render.`);
            return;
        }

        if (!initialized) {
            console.error('render() was called before initialize(), renderer must be initialized first.');
            return;
        }
        let useExisting = false;
        let existingDimensions = {};
        const resolveProp = (prop, subprop, checkExisting) => {
            const p1 = d[prop] || defaults[prop];
            const s1 = !(checkExisting && useExisting) ? p1[subprop] : existingDimensions[subprop];
            const s2 = defaults[prop][subprop];
            return typeof p1 === 'function'
                ? p1(d, nodeData.datum)
                : typeof s1 === 'function'
                ? s1(d, nodeData.datum)
                : s1 || s2 || (!subprop ? p1 : undefined);
        };
        useExisting = resolveProp('existingElement', 'useForDimensions');
        existingDimensions = resolveProp('existingElement', 'dimensions');
        const width = parseFloat(resolveProp('dimensions', 'width', true) || 0);
        const height = parseFloat(resolveProp('dimensions', 'height', true) || 0);
        const x = parseFloat(resolveProp('dimensions', 'x', true) || 0);
        const y = parseFloat(resolveProp('dimensions', 'y', true) || 0);
        const node = document.createElement(resolveProp('parentSemantics', 'elementType'));
        const wrapperAttrs = resolveProp('parentSemantics', 'attributes');
        if (typeof wrapperAttrs === 'object') {
            Object.keys(wrapperAttrs).forEach(wrapperAttr => {
                node.setAttribute(wrapperAttr, wrapperAttrs[wrapperAttr]);
            });
        }
        node.setAttribute('role', resolveProp('parentSemantics', 'role'));
        node.id = id;
        node.classList.add('dn-node');
        node.classList.add(resolveProp('cssClass'));
        node.style.width = width + 'px';
        node.style.height = height + 'px';
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        node.setAttribute('tabindex', '-1');

        const nodeText = document.createElement(resolveProp('semantics', 'elementType'));
        const attributes = resolveProp('semantics', 'attributes');
        if (typeof attributes === 'object') {
            Object.keys(attributes).forEach(attribute => {
                node.setAttribute(attribute, attributes[attribute]);
            });
        }
        nodeText.setAttribute('role', resolveProp('semantics', 'role'));
        nodeText.classList.add('dn-node-text');
        if (options.showText) {
            nodeText.innerText = d.description;
        }
        const label = resolveProp('semantics', 'label');
        if (!label) {
            console.error(
                'Accessibility error: a label must be supplied to every rendered element using semantics.label.'
            );
        }
        nodeText.setAttribute('aria-label', label);

        node.appendChild(nodeText);
        const hasPath = resolveProp('dimensions', 'path');
        if (hasPath) {
            const totalWidth = width + x + 10;
            const totalHeight = height + y + 10;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', totalWidth);
            svg.setAttribute('height', totalHeight);
            svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
            svg.style.left = -x;
            svg.style.top = -y;
            svg.classList.add('dn-node-svg');
            svg.setAttribute('role', 'presentation');
            svg.setAttribute('focusable', 'false');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', hasPath);
            path.classList.add('dn-node-path');
            svg.appendChild(path);
            node.appendChild(svg);
        }
        renderer.wrapper.appendChild(node);
        return node;
    };
    renderer.remove = renderId => {
        const node = document.getElementById(renderId);
        if (node) {
            node.remove();
        }
    };
    renderer.clearStructure = () => {
        [...renderer.wrapper.children].forEach(child => {
            if (!(renderer.entryButton && renderer.entryButton === child)) {
                renderer.remove(child.id);
            }
        });
    };
    return renderer;
};


/***/ }),

/***/ 36:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Fh": () => (/* binding */ structure)
/* harmony export */ });
/* unused harmony exports buildNodeStructureFromVegaLite, buildNodeStructure */
/* harmony import */ var _consts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(772);


const structure = StructureOptions => {
    if (
        StructureOptions.dataType === 'vega-lite' ||
        StructureOptions.dataType === 'vl' ||
        StructureOptions.dataType === 'Vega-Lite'
    ) {
        return buildNodeStructureFromVegaLite(StructureOptions);
    } else {
        console.warn(
            'Apologies, we currently only have structure scaffolding for Vega-Lite, generic scaffolding coming soon!'
        );
        return;
    }
};

const buildNodeStructureFromVegaLite = options => {
    let navigationRules = _consts__WEBPACK_IMPORTED_MODULE_0__/* .GenericLimitedNavigationRules */ .SC
    let nodes = {};
    let edges = {};
    let elementData = {};
    let total = 0;

    const includeGroup = options.groupInclusionCriteria ? options.groupInclusionCriteria : () => true;
    const includeItem = options.itemInclusionCriteria ? options.itemInclusionCriteria : () => true;
    const includeDataProperties = options.datumInclusionCriteria ? options.datumInclusionCriteria : () => true;
    const offset = options.vegaLiteView._renderer._origin;
    const groupParent = options.vegaLiteView._scenegraph.root.items[0].mark.items[0];

    const idBuilder = (i, level) => {
        // const item = it.mark || it
        if (i['data-navigator-id']) {
            return i['data-navigator-id'];
        }
        const id = `dn-node-${level}-${total}`; // (item.name || '') + (item.role || '') + (item.marktype || '') + total
        total++;
        i['data-navigator-id'] = id;
        return id;
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
                        navigationRules: ['left', 'right']
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
                        navigationRules: ['left', 'right']
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
                        navigationRules: ['parent', 'child']
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
                        navigationRules: ['parent', 'child']
                    };
                }
            }
        }
        if (options.exitFunction) {
            edgeList.push('any-exit');
            if (!edges['any-exit']) {
                edges['any-exit'] = {
                    source: options.getCurrent,
                    target: options.exitFunction,
                    navigationRules: ['exit']
                };
            }
        }
        edgeList.push('any-undo');
        if (!edges['any-undo']) {
            edges['any-undo'] = {
                source: options.getCurrent,
                target: options.getPrevious,
                navigationRules: ['undo']
            };
        }
        return edgeList;
    };
    const nodeBuilder = (item, level, offset, index, parent) => {
        const id = idBuilder(item, level);
        const renderId = 'render-' + id;
        const o = offset || [0, 0];
        nodes[id] = {};
        nodes[id].d = {};
        nodes[id].id = id;
        nodes[id].renderId = renderId;
        nodes[id].index = index;
        nodes[id].level = level;
        nodes[id].parent = parent;

        elementData[renderId] = {}
        elementData[renderId].renderId = renderId
        elementData[renderId].dimensions = {}
        elementData[renderId].dimensions.x = item.bounds.x1 + o[0];
        elementData[renderId].dimensions.y = item.bounds.y1 + o[1];
        elementData[renderId].dimensions.width = item.bounds.x2 - item.bounds.x1;
        elementData[renderId].dimensions.height = item.bounds.y2 - item.bounds.y1;
        elementData[renderId].cssClass = 'dn-vega-lite-node';
        
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
        elementData[renderId].semantics = {}
        elementData[renderId].semantics.label = options.nodeDescriber
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
        nodes,
        edges,
        elementData,
        navigationRules
    };
};

const buildNodeStructure = options => {
    // this will eventually be our generic method for dn.structure()

    // need to convert to a graph structure!

    return {};
};


/***/ }),

/***/ 87:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "A": () => (/* binding */ describeNode)
/* harmony export */ });
const describeNode = (d, descriptionOptions) => {
    const keys = Object.keys(d);
    let description = '';
    keys.forEach(key => {
        description += `${descriptionOptions.omitKeyNames ? '' : key + ': '}${d[key]}. `;
    });
    description += descriptionOptions.semanticLabel || 'Data point.';
    return description;
};


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/* harmony import */ var _src_data_navigator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(641);
/* harmony import */ var _src_utilities__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(87);


let scale;
const hideTooltip = () => {
    document.getElementById('tooltip').classList.add('hidden');
};

const showTooltip = e => {
    // console.log('showing tooltip', e);
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('hidden');
    tooltip.innerText = e.semantics.label;
    // const xCenter = e.x + e.width/2
    const bbox = tooltip.getBoundingClientRect();
    const offset = 5 * scale;
    const yOffset = bbox.height + offset;
    // console.log(e.d.team);
    if (
        !(e.d.team === 'Manchester United' || e.d.team === 'Liverpool' || (!e.d.team && e.d.contest === 'BPL'))
    ) {
        tooltip.style.textAlign = 'left';
        tooltip.style.transform = `translate(${e.dimensions.x * scale - offset + 1}px,${e.dimensions.y * scale - yOffset}px)`;
    } else {
        tooltip.style.textAlign = 'right';
        // console.log(e.x);
        // console.log(e.width);
        // console.log(e.x + e.width);
        const xOffset = bbox.width;
        tooltip.style.transform = `translate(${(e.dimensions.x + e.dimensions.width) * scale + offset - xOffset + 1}px,${
            e.dimensions.y * scale - yOffset
        }px)`;
    }
};

let entered;
let previous;
let current;
// input data
// extracted from https://www.highcharts.com/demo/column-stacked
let nodes = {
    title: {
        d: {
            title: 'Major Trophies for some English teams'
        },
        dimensions: { x: 12, y: 9, width: 686, height: 56 },
        id: 'title',
        renderId: 'title',
        edges: ['any-return', 'any-exit', 'title-legend'],
        semantics: { label: 'Major Trophies for some English teams' }
    },
    legend: {
        d: {
            legend: 'Contests Included: BPL, FA Cup, CL'
        },
        dimensions: { x: 160, y: 162, width: 398, height: 49 },
        id: 'legend',
        renderId: 'legend',
        edges: ['any-return', 'any-exit', 'title-legend', 'legend-y_axis', 'legend-bpl'],
        semantics: { label: 'Legend. Contests Included: BPL, FA Cup, CL. Press Enter to explore these contests.' }
    },
    y_axis: {
        d: {
            'Y Axis': 'Label: Count trophies. Values range from 0 to 30 on a numerical scale.'
        },
        dimensions: { x: 21, y: 311, width: 39, height: 194 },
        id: 'y_axis',
        renderId: 'y_axis',
        edges: ['any-return', 'any-exit', 'legend-y_axis', 'y_axis-x_axis'],
        semantics: { label: 'Y Axis. Label: Count trophies. Values range from 0 to 30 on a numerical scale.' }
    },
    x_axis: {
        d: {
            'X Axis': 'Teams included: Arsenal, Chelsea, Liverpool, Manchester United.'
        },
        dimensions: { x: 191, y: 736, width: 969, height: 44 },
        id: 'x_axis',
        renderId: 'x_axis',
        edges: ['any-return', 'any-exit', 'y_axis-x_axis', 'x_axis-arsenal'],
        semantics: {
            label: 'X Axis. Arsenal, Chelsea, Liverpool, Manchester United. Press Enter to explore these teams.'
        }
    },
    arsenal: {
        d: {
            team: 'Arsenal',
            'total trophies': 17
        },
        dimensions: { x: 194, y: 370, width: 122, height: 357 },
        id: 'arsenal',
        renderId: 'arsenal',
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
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    team: 'Arsenal',
                    'total trophies': 17,
                    contains: '3 contests'
                },
                {}
            )
        }
    },
    chelsea: {
        d: {
            team: 'Chelsea',
            'total trophies': 15
        },
        dimensions: { x: 458, y: 414, width: 122, height: 312 },
        id: 'chelsea',
        renderId: 'chelsea',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'arsenal-chelsea',
            'chelsea-bpl2',
            'chelsea-liverpool',
            'any-legend'
        ],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    team: 'Chelsea',
                    'total trophies': 15,
                    contains: '3 contests'
                },
                {}
            )
        }
    },
    liverpool: {
        d: {
            team: 'Liverpool',
            'total trophies': 15
        },
        dimensions: { x: 722, y: 414, width: 122, height: 312 },
        id: 'liverpool',
        renderId: 'liverpool',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'chelsea-liverpool',
            'liverpool-bpl3',
            'liverpool-manchester',
            'any-legend'
        ],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    team: 'Liverpool',
                    'total trophies': 15,
                    contains: '3 contests'
                },
                {}
            )
        }
    },
    manchester: {
        d: {
            team: 'Manchester United',
            'total trophies': 28
        },
        dimensions: { x: 986, y: 138, width: 122, height: 589 },
        id: 'manchester',
        renderId: 'manchester',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'liverpool-manchester',
            'manchester-bpl4',
            'manchester-arsenal',
            'any-legend'
        ],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    team: 'Manchester',
                    'total trophies': 28,
                    contains: '3 contests'
                },
                {}
            )
        }
    },
    bpl: {
        d: {
            contest: 'BPL',
            'total trophies': 22
        },
        dimensions: {
            x: 194,
            y: 138,
            width: 918,
            height: 378,
            path: 'M987 136H985.762L985.21 137.108L848.762 411H720H584H457.309L321.603 368.093L321.309 368H321H196H194V370V430V432H196H320.431L458.948 517.701L459.431 518H460H584H584.579L585.069 517.69L720.579 432H850H850.152L850.303 431.977L987.152 411H1112H1114V409V138V136H1112H987Z'
        },
        id: 'bpl',
        renderId: 'bpl',
        edges: ['any-return', 'any-exit', 'legend-bpl', 'any-legend', 'bpl-bpl1', 'bpl-fa', 'cl-bpl'],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'BPL',
                    'total trophies': 22,
                    contains: '4 teams'
                },
                {}
            )
        }
    },
    fa: {
        d: {
            contest: 'FA Cup',
            'total trophies': 42
        },
        dimensions: {
            x: 194,
            y: 414,
            width: 918,
            height: 311,
            path: 'M987.407 412H987.263L987.119 412.021L849.712 432H722.274H721.698L721.211 432.306L586.141 517H459.707L324.059 432.304L323.573 432H323H196H194V434V725V727H196H323H323.288L323.564 726.919L459.421 687H586.717H587.298L587.788 686.689L722.855 601H849.414L986.563 664.813L986.965 665H987.407H1112H1114V663V414V412H1112H987.407Z'
        },
        id: 'fa',
        renderId: 'fa',
        edges: ['any-return', 'any-exit', 'any-legend', 'bpl-fa', 'fa-fa1', 'fa-cl'],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'FA Cup',
                    'total trophies': 42,
                    contains: '4 teams'
                },
                {}
            )
        }
    },
    cl: {
        d: {
            contest: 'CL',
            'total trophies': 11
        },
        dimensions: {
            x: 194,
            y: 609,
            width: 918,
            height: 116,
            path: 'M321.731 723H191V727H322H457H585H721H849H987H1112H1114V725V666V664H1112H987.441L849.841 600.186L849.441 600H849H721H720.421L719.931 600.31L584.421 686H457H456.731L456.471 686.071L321.731 723Z'
        },
        id: 'cl',
        renderId: 'cl',
        edges: ['any-return', 'any-exit', 'any-legend', 'fa-cl', 'cl-cl1', 'cl-bpl'],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'CL',
                    'total trophies': 11,
                    contains: '4 teams'
                },
                {}
            )
        }
    },
    bpl1: {
        d: {
            contest: 'BPL',
            team: 'Arsenal',
            trophies: 3
        },
        dimensions: { x: 194, y: 370, width: 122, height: 62 },
        id: 'bpl1',
        renderId: 'bpl1',
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
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'BPL',
                    team: 'Arsenal',
                    trophies: 3
                },
                {}
            )
        }
    },
    fa1: {
        d: {
            contest: 'FA Cup',
            team: 'Arsenal',
            trophies: 14
        },
        dimensions: { x: 194, y: 436, width: 122, height: 291 },
        id: 'fa1',
        renderId: 'fa1',
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
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'FA Cup',
                    team: 'Arsenal',
                    trophies: 14
                },
                {}
            )
        }
    },
    cl1: {
        d: {
            contest: 'CL',
            team: 'Arsenal',
            trophies: 0
        },
        dimensions: { x: 194, y: 727, width: 122, height: 0 },
        id: 'cl1',
        renderId: 'cl1',
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
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'CL',
                    team: 'Arsenal',
                    trophies: 0
                },
                {}
            )
        }
    },
    bpl2: {
        d: {
            contest: 'BPL',
            team: 'Chelsea',
            trophies: 5
        },
        dimensions: { x: 458, y: 414, width: 122, height: 103 },
        id: 'bpl2',
        renderId: 'bpl2',
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
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'BPL',
                    team: 'Chelsea',
                    trophies: 5
                },
                {}
            )
        }
    },
    fa2: {
        d: {
            contest: 'FA Cup',
            team: 'Chelsea',
            trophies: 8
        },
        dimensions: { x: 458, y: 521, width: 122, height: 165 },
        id: 'fa2',
        renderId: 'fa2',
        edges: ['any-return', 'chelsea-fa2', 'any-exit', 'any-legend', 'bpl2-fa2', 'fa2-cl2', 'fa1-fa2', 'fa2-fa3'],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'FA Cup',
                    team: 'Chelsea',
                    trophies: 8
                },
                {}
            )
        }
    },
    cl2: {
        d: {
            contest: 'CL',
            team: 'Chelsea',
            trophies: 2
        },
        dimensions: { x: 458, y: 691, width: 122, height: 35 },
        id: 'cl2',
        renderId: 'cl2',
        edges: ['any-return', 'any-exit', 'any-legend', 'chelsea-cl2', 'fa2-cl2', 'cl2-bpl2', 'cl1-cl2', 'cl2-cl3'],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'CL',
                    team: 'Chelsea',
                    trophies: 2
                },
                {}
            )
        }
    },
    bpl3: {
        d: {
            contest: 'BPL',
            team: 'Liverpool',
            trophies: 1
        },
        dimensions: { x: 722, y: 414, width: 122, height: 18 },
        id: 'bpl3',
        renderId: 'bpl3',
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
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'BPL',
                    team: 'Liverpool',
                    trophies: 1
                },
                {}
            )
        }
    },
    fa3: {
        d: {
            contest: 'FA Cup',
            team: 'Liverpool',
            trophies: 8
        },
        dimensions: { x: 722, y: 437, width: 122, height: 165 },
        id: 'fa3',
        renderId: 'fa3',
        edges: ['any-return', 'any-exit', 'any-legend', 'liverpool-fa3', 'bpl3-fa3', 'fa3-cl3', 'fa2-fa3', 'fa3-fa4'],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'FA Cup',
                    team: 'Liverpool',
                    trophies: 8
                },
                {}
            )
        }
    },
    cl3: {
        d: {
            contest: 'CL',
            team: 'Liverpool',
            trophies: 6
        },
        dimensions: { x: 722, y: 607, width: 122, height: 119 },
        id: 'cl3',
        renderId: 'cl3',
        edges: ['any-return', 'any-exit', 'any-legend', 'liverpool-cl3', 'fa3-cl3', 'cl3-bpl3', 'cl2-cl3', 'cl3-cl4'],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'CL',
                    team: 'Liverpool',
                    trophies: 6
                },
                {}
            )
        }
    },
    bpl4: {
        d: {
            contest: 'BPL',
            team: 'Manchester United',
            trophies: 13
        },
        dimensions: { x: 986, y: 138, width: 122, height: 273 },
        id: 'bpl4',
        renderId: 'bpl4',
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
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'BPL',
                    team: 'Manchester United',
                    trophies: 13
                },
                {}
            )
        }
    },
    fa4: {
        d: {
            contest: 'FA Cup',
            team: 'Manchester United',
            trophies: 12
        },
        dimensions: { x: 986, y: 414, width: 122, height: 250 },
        id: 'fa4',
        renderId: 'fa4',
        edges: ['any-return', 'any-exit', 'any-legend', 'manchester-fa4', 'bpl4-fa4', 'fa4-cl4', 'fa3-fa4', 'fa4-fa1'],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'FA Cup',
                    team: 'Manchester United',
                    trophies: 12
                },
                {}
            )
        }
    },
    cl4: {
        d: {
            contest: 'CL',
            team: 'Manchester United',
            trophies: 3
        },
        dimensions: { x: 986, y: 667, width: 122, height: 58 },
        id: 'cl4',
        renderId: 'cl4',
        edges: ['any-return', 'any-exit', 'any-legend', 'manchester-cl4', 'fa4-cl4', 'cl4-bpl4', 'cl3-cl4', 'cl4-cl1'],
        semantics: {
            label: (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(
                {
                    contest: 'CL',
                    team: 'Manchester United',
                    trophies: 3
                },
                {}
            )
        }
    }
};
let edges = {
    'any-legend': {
        source: () => current,
        target: () => {
            const hasParent = !!+current.substring(current.length - 1);
            return hasParent ? current.substring(0, current.length - 1) : 'legend';
        },
        navigationRules: ['legend']
    },
    'any-x_axis': {
        source: 'x_axis',
        target: () => current, // this is because 'parent' moves backwards or towards the source! 
        navigationRules: ['parent'] // we could have optionally made a new rule just for this, but went with parent instead
    },
    'any-return': {
        source: () => current,
        target: () => previous,
        navigationRules: ['previous position']
    },
    'any-exit': {
        source: () => current,
        target: () => {
            // console.log("exiting!")
            exit();
            hideTooltip();
            // entered = false;
            return '';
        },
        navigationRules: ['exit']
    },
    'x_axis-exit': {
        source: 'x_axis',
        target: () => {
            // console.log('exiting!')
            exit();
            hideTooltip();
            return '';
        },
        navigationRules: ['down']
    },
    'x_axis-arsenal': {
        source: 'x_axis',
        target: 'arsenal',
        navigationRules: ['child', 'parent']
    },
    'arsenal-bpl1': {
        source: 'arsenal',
        target: 'bpl1',
        navigationRules: ['child', 'parent']
    },
    'arsenal-fa1': {
        source: 'arsenal',
        target: 'fa1',
        navigationRules: ['child', 'parent']
    },
    'arsenal-cl1': {
        source: 'arsenal',
        target: 'cl1',
        navigationRules: ['child', 'parent']
    },
    'chelsea-fa2': {
        source: 'chelsea',
        target: 'fa2',
        navigationRules: ['child', 'parent']
    },
    'chelsea-cl2': {
        source: 'chelsea',
        target: 'cl2',
        navigationRules: ['child', 'parent']
    },
    'liverpool-fa3': {
        source: 'liverpool',
        target: 'fa3',
        navigationRules: ['child', 'parent']
    },
    'liverpool-cl3': {
        source: 'liverpool',
        target: 'cl3',
        navigationRules: ['child', 'parent']
    },
    'manchester-fa4': {
        source: 'manchester',
        target: 'fa4',
        navigationRules: ['child', 'parent']
    },
    'manchester-cl4': {
        source: 'manchester',
        target: 'cl4',
        navigationRules: ['child', 'parent']
    },
    'arsenal-chelsea': {
        source: 'arsenal',
        target: 'chelsea',
        navigationRules: ['left', 'right']
    },
    'manchester-arsenal': {
        source: 'manchester',
        target: 'arsenal',
        navigationRules: ['left', 'right']
    },
    'title-legend': {
        source: 'title',
        target: 'legend',
        navigationRules: ['up', 'down']
    },
    'legend-y_axis': {
        source: 'legend',
        target: 'y_axis',
        navigationRules: ['up', 'down']
    },
    'legend-bpl': {
        source: 'legend',
        target: 'bpl',
        navigationRules: ['child', 'parent']
    },
    'y_axis-x_axis': {
        source: 'y_axis',
        target: 'x_axis',
        navigationRules: ['up', 'down']
    },
    'chelsea-bpl2': {
        source: 'chelsea',
        target: 'bpl2',
        navigationRules: ['child', 'parent']
    },
    'chelsea-liverpool': {
        source: 'chelsea',
        target: 'liverpool',
        navigationRules: ['left', 'right']
    },
    'liverpool-bpl3': {
        source: 'liverpool',
        target: 'bpl3',
        navigationRules: ['child', 'parent']
    },
    'liverpool-manchester': {
        source: 'liverpool',
        target: 'manchester',
        navigationRules: ['left', 'right']
    },
    'manchester-bpl4': {
        source: 'manchester',
        target: 'bpl4',
        navigationRules: ['child', 'parent']
    },
    'bpl-bpl1': {
        source: 'bpl',
        target: 'bpl1',
        navigationRules: ['child', 'parent']
    },
    'bpl-fa': {
        source: 'bpl',
        target: 'fa',
        navigationRules: ['up', 'down']
    },
    'cl-bpl': {
        source: 'cl',
        target: 'bpl',
        navigationRules: ['up', 'down']
    },
    'fa-fa1': {
        source: 'fa',
        target: 'fa1',
        navigationRules: ['child', 'parent']
    },
    'fa-cl': {
        source: 'fa',
        target: 'cl',
        navigationRules: ['up', 'down']
    },
    'cl-cl1': {
        source: 'cl',
        target: 'cl1',
        navigationRules: ['child', 'parent']
    },
    'bpl1-fa1': {
        source: 'bpl1',
        target: 'fa1',
        navigationRules: ['up', 'down']
    },
    'cl1-bpl1': {
        source: 'cl1',
        target: 'bpl1',
        navigationRules: ['up', 'down']
    },
    'bpl1-bpl2': {
        source: 'bpl1',
        target: 'bpl2',
        navigationRules: ['left', 'right']
    },
    'bpl4-bpl1': {
        source: 'bpl4',
        target: 'bpl1',
        navigationRules: ['left', 'right']
    },
    'fa1-cl1': {
        source: 'fa1',
        target: 'cl1',
        navigationRules: ['up', 'down']
    },
    'fa1-fa2': {
        source: 'fa1',
        target: 'fa2',
        navigationRules: ['left', 'right']
    },
    'fa4-fa1': {
        source: 'fa4',
        target: 'fa1',
        navigationRules: ['left', 'right']
    },
    'cl1-cl2': {
        source: 'cl1',
        target: 'cl2',
        navigationRules: ['left', 'right']
    },
    'cl4-cl1': {
        source: 'cl4',
        target: 'cl1',
        navigationRules: ['left', 'right']
    },
    'bpl2-fa2': {
        source: 'bpl2',
        target: 'fa2',
        navigationRules: ['up', 'down']
    },
    'cl2-bpl2': {
        source: 'cl2',
        target: 'bpl2',
        navigationRules: ['up', 'down']
    },
    'bpl2-bpl3': {
        source: 'bpl2',
        target: 'bpl3',
        navigationRules: ['left', 'right']
    },
    'fa2-cl2': {
        source: 'fa2',
        target: 'cl2',
        navigationRules: ['up', 'down']
    },
    'fa2-fa3': {
        source: 'fa2',
        target: 'fa3',
        navigationRules: ['left', 'right']
    },
    'cl2-cl3': {
        source: 'cl2',
        target: 'cl3',
        navigationRules: ['left', 'right']
    },
    'bpl3-fa3': {
        source: 'bpl3',
        target: 'fa3',
        navigationRules: ['up', 'down']
    },
    'cl3-bpl3': {
        source: 'cl3',
        target: 'bpl3',
        navigationRules: ['up', 'down']
    },
    'bpl3-bpl4': {
        source: 'bpl3',
        target: 'bpl4',
        navigationRules: ['left', 'right']
    },
    'fa3-cl3': {
        source: 'fa3',
        target: 'cl3',
        navigationRules: ['up', 'down']
    },
    'fa3-fa4': {
        source: 'fa3',
        target: 'fa4',
        navigationRules: ['left', 'right']
    },
    'cl3-cl4': {
        source: 'cl3',
        target: 'cl4',
        navigationRules: ['left', 'right']
    },
    'bpl4-fa4': {
        source: 'bpl4',
        target: 'fa4',
        navigationRules: ['up', 'down']
    },
    'cl4-bpl4': {
        source: 'cl4',
        target: 'bpl4',
        navigationRules: ['up', 'down']
    },
    'fa4-cl4': {
        source: 'fa4',
        target: 'cl4',
        navigationRules: ['up', 'down']
    }
};
let navigationRules = {
    right: {
        key: 'ArrowRight',
        direction: 'target'
    },
    left: {
        key: 'ArrowLeft',
        direction: 'source'
    },
    down: {
        key: 'ArrowDown',
        direction: 'target'
    },
    up: {
        key: 'ArrowUp',
        direction: 'source'
    },
    child: {
        key: 'Enter',
        direction: 'target'
    },
    parent: {
        key: 'Backspace',
        direction: 'source'
    },
    exit: {
        key: 'Escape',
        direction: 'target'
    },
    'previous position': {
        key: 'Period',
        direction: 'target'
    },
    legend: {
        key: 'KeyL',
        direction: 'target'
    }
};

const structure = {
    nodes,
    edges
};

const rendering = _src_data_navigator__WEBPACK_IMPORTED_MODULE_0__/* .dataNavigator.rendering */ .A.rendering({
    elementData: structure.nodes,
    defaults: {
        cssClass: (a, _b) => {
            if (!a.dimensions.path) {
                return 'dn-test-class';
            }
            return 'dn-test-path';
        }
    },
    suffixId: 'data-navigator-schema',
    root: {
        id: 'root',
        cssClass: '',
        width: '100%',
        height: 0
    },
    entryButton: {
        include: true,
        callbacks: {
            pressed: () => {
                enter();
            }
        }
    },
    exitElement: {
        include: true
    }
});

// create data navigator
rendering.initialize();

const input = _src_data_navigator__WEBPACK_IMPORTED_MODULE_0__/* .dataNavigator.input */ .A.input({
    structure,
    navigationRules,
    entryPoint: 'title',
    exitPoint: rendering.exitElement.id
});

window.dn = {
    structure,
    input,
    rendering
};

const initiateLifecycle = nextNode => {
    // console.log("moving to",nextNode)
    const node = rendering.render({
        renderId: nextNode.renderId,
        datum: nextNode
    });
    node.addEventListener("keydown",(e)=>{
        // myFunction(e) // could run whatever here, of course
        const direction = input.keydownValidator(e)
        if (direction) {
            e.preventDefault();
            move(direction)
        }
    })
    node.addEventListener("blur",(e)=>{
        entered = false;
        // previous = current;
        // current = null;
        // rendering.remove(previous);
    })
    hideTooltip()
    if (nextNode.d && (nextNode.d.team || nextNode.d.contest)) {
        showTooltip(nextNode)
    }
    input.focus(nextNode.renderId); // actually focuses the element
    entered = true;
    previous = current;
    current = nextNode.id;
    rendering.remove(previous);
}

const enter = () => {
    const nextNode = input.enter();
    if (nextNode) {
        entered = true;
        initiateLifecycle(nextNode)
    }
};

const move = direction => {
    const nextNode = input.move(current, direction); // .moveTo does the same thing but only uses NodeId
    if (nextNode) {
        initiateLifecycle(nextNode)
    }
};

const exit = () => {
    entered = false;
    rendering.exitElement.style.display = 'block';
    input.focus(rendering.exitElement.id); // actually focuses the element
    previous = current;
    current = null;
    rendering.remove(previous);
};

const handleMovement = ev => {
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
    if (current && direction) {
        move(direction);
    }
};
const touchHandler = new Hammer(document.getElementById('root'), {});
touchHandler.get('pinch').set({ enable: false });
touchHandler.get('rotate').set({ enable: false });
touchHandler.get('pan').set({ enable: false });
touchHandler.get('swipe').set({ direction: Hammer.DIRECTION_ALL, velocity: 0.2 });

touchHandler.on('press', ev => {
    // enter()
});
touchHandler.on('pressup', ev => {
    // entered = true;
    enter();
});
touchHandler.on('swipe', ev => {
    handleMovement(ev);
});

let model;
let isVideo = false;
let ready = false;
let timer;
let command = null;
const video = document.getElementById('feed');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const modelParams = {
    flipHorizontal: true,
    // outputStride: 16,
    // imageScaleFactor: 1,
    iouThreshold: 0.5,
    scoreThreshold: 0.45,
    modelType: 'ssd320fpnlite',
    modelSize: 'small'
    // bboxLineWidth: "2",
    // fontSize: 17,
};

const openCam = () => {
    document.getElementById('openWebcam').disabled = true;
    document.getElementById('ready').innerText = 'No. Loading video feed...';
    handTrack.startVideo(video).then(status => {
        // console.log('video started', status);
        document.getElementById('ready').innerText = 'Feed ready. Close your hand to prepare for gesture commands.';
        if (status) {
            //   updateNote.innerText = "Video started. Now tracking";
            isVideo = true;
            document.getElementById('status').classList.remove('hidden');
            document.getElementById('canvas').classList.remove('hidden');
            runDetection();
        } else {
            //   updateNote.innerText = "Please enable video";
        }
    });
};

const runDetection = () => {
    model.detect(video).then(predictions => {
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
};

const closeCam = () => {
    isVideo = false;
    handTrack.stopVideo(video);
    document.getElementById('openWebcam').classList.add('hidden');
    document.getElementById('canvas').classList.add('hidden');
    document.getElementById('status').innerText = 'Video feed disabled. Model disposed!';
    model.dispose();
};

const setReady = bbox => {
    ready = bbox;
    document.getElementById('ready').innerText = 'Yes!';
};
const setNotReady = () => {
    ready = false;
    document.getElementById('ready').innerText = 'No.';
};
const attemptCommand = pred => {
    if (ready) {
        if (pred.label === 'point') {
            // console.log('POINT');
            const ev = {
                deltaX: ready[2] - ready[0] - (pred.bbox[2] - pred.bbox[0]),
                deltaY: ready[3] - ready[1] - (pred.bbox[3] - pred.bbox[1])
            };
            handleMovement(ev);
            setNotReady();
        }
        if (pred.label === 'open' && !entered) {
            // console.log('GOIN IN!');
            // entered = true;
            enter();
            setNotReady();
        } else if (pred.label === 'open' && entered) {
            if (current) {
                move('child');
                setNotReady();
            }
        }
    } else if (pred.label === 'closed') {
        // console.log('NOW READY');
        setReady(pred.bbox);
    }
};

const loadModel = () => {
    document.getElementById('loadModel').disabled = true;
    document.getElementById('status').classList.remove('hidden');
    document.getElementById('ready').innerText = 'No. Loading model...';
    handTrack.load(modelParams).then(lmodel => {
        // detect objects in the image.
        model = lmodel;
        // console.log(model);
        document.getElementById('openWebcam').disabled = false;
        document.getElementById('ready').innerText = 'No. Model loaded but webcam feed required.';
    });
};

document.getElementById('loadModel').addEventListener('click', loadModel);
document.getElementById('openWebcam').addEventListener('click', openCam);
document.getElementById('closeWebcam').addEventListener('click', closeCam);

const attemptSubmission = e => {
    // console.log('form submission!');
    const command = document.getElementById('textCommand').value.toLowerCase();
    commandHandler(command);
    e.preventDefault();
};

const commandHandler = command => {
    if (navigationRules[command]) {
        validCommand(command);
        move(command);
    } else if (command === 'enter' && !entered) {
        validCommand(command);
        enter();
    } else if (command === 'exit' && entered) {
        validCommand(command);
        exit();
        hideTooltip();
    } else {
        invalidCommand(command);
    }
};

const validCommand = command => {
    document.getElementById('alert').classList.remove('alert');
    document.getElementById('alert').innerText = `Command valid. Attempting "${command}."`;
};

const invalidCommand = command => {
    document.getElementById('alert').classList.add('alert');
    document.getElementById(
        'alert'
    ).innerText = `"${command}" not recognized as a command! Possible commands are: ${commandsList}.`;
};

const lowConfidence = command => {
    document.getElementById('alert').classList.add('alert');
    document.getElementById(
        'alert'
    ).innerText = `We thought we heard "${command}" but aren't sure. Please try again! Possible commands are: ${commandsList}.`;
};

document.getElementById('form').addEventListener('submit', attemptSubmission);

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

const commands = Object.keys(navigationRules);
commands.push('enter');
const commandsList = commands.join(', ');

const recognition = new SpeechRecognition();
if (SpeechGrammarList) {
    const speechRecognitionList = new SpeechGrammarList();
    const grammar = '#JSGF V1.0; grammar colors; public <color> = ' + commands.join(' | ') + ' ;';
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;
}
recognition.continuous = false;
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

const enableSpeech = () => {
    recognition.start();
    document.getElementById('alert').classList.remove('alert');
    document.getElementById('alert').innerText = `Ready! Please speak a command.`;
};

document.getElementById('enableSpeech').addEventListener('click', enableSpeech);

recognition.onresult = event => {
    const command = event.results[0][0].transcript;
    // console.log('Result: ' + command);
    // console.log('Confidence: ' + event.results[0][0].confidence);
    if (+event.results[0][0].confidence >= 0.65) {
        commandHandler(command);
    } else {
        lowConfidence(command);
    }
};

recognition.onspeechend = function () {
    recognition.stop();
};

recognition.onnomatch = function (event) {
    // console.log("I didn't recognise that color.");
};

recognition.onerror = function (event) {
    // console.log('Error occurred in recognition: ' + event.error);
};

const setGeometryData = () => {
    // Haven't resized in 100ms!
    const currentWidth = +document.getElementById('chart').getBoundingClientRect().width;
    scale = currentWidth / 1200;
    const xAdjust = (1200 - currentWidth) / 2;
    const entryButton = document.querySelector('.dn-entry-button');
    const buttonRect = entryButton.getBoundingClientRect();
    const yAdjust = +buttonRect.height / (scale * 2) - 9;
    const buttonXAdjust = (buttonRect.width * scale * (1 / scale) - buttonRect.width * scale) / 2;
    document.querySelector('.dn-wrapper').style.transform = `scale(${scale}) translate(${-xAdjust}px,${-yAdjust}px)`;
    entryButton.style.transform = `scale(${1 / scale}) translate(${buttonXAdjust}px,0px)`;
};

let resizeTimer;
window.onresize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setGeometryData, 150);
};

setGeometryData();

})();

/******/ })()
;