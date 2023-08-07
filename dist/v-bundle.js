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

        renderer.root.appendChild(renderer.wrapper);

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

            renderer.root.appendChild(renderer.exitElement);
        }
        initialized = true;
        return renderer.root;
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



let view;
let spec;
let dn;
let entered;
let current;
let previous;
const getCurrent = () => current
const getPrevious = () => previous
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
        return (0,_src_utilities__WEBPACK_IMPORTED_MODULE_1__/* .describeNode */ .A)(d, {});
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

const initiateLifecycle = nextNode => {
    const node = dn.rendering.render({
        renderId: nextNode.renderId,
        datum: nextNode
    });
    node.addEventListener("keydown",(e)=>{
        // myFunction(e) // could run whatever here, of course
        const direction = dn.input.keydownValidator(e)
        if (direction) {
            e.preventDefault();
            move(direction)
        }
    })
    node.addEventListener("blur",()=>{
        entered = false;
    })
    // showTooltip(nextNode)
    dn.input.focus(nextNode.renderId); // actually focuses the element
    entered = true;
    previous = current;
    current = nextNode.id;
    if (previous) {
        dn.rendering.remove(dn.structure.nodes[previous].renderId);
    }
}

const enter = () => {
    const nextNode = dn.input.enter();
    if (nextNode) {
        entered = true;
        initiateLifecycle(nextNode)
    }
};

const move = direction => {
    const nextNode = dn.input.move(current, direction); // .moveTo does the same thing but only uses NodeId
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
        const structure = _src_data_navigator__WEBPACK_IMPORTED_MODULE_0__/* .dataNavigator.structure */ .A.structure({
            dataType: "vega-lite",
            vegaLiteView: v,
            vegaLiteSpec: spec,
            groupInclusionCriteria,
            itemInclusionCriteria,
            datumInclusionCriteria,
            keyRenamingHash: {},
            nodeDescriber,
            getCurrent,
            getPrevious,
            exitFunction: exit
        });

        const rendering = _src_data_navigator__WEBPACK_IMPORTED_MODULE_0__/* .dataNavigator.rendering */ .A.rendering({
            elementData: structure.elementData,
            suffixId: 'data-navigator-schema',
            root: {
                id: 'view',
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
            structure: {
                nodes: structure.nodes,
                edges: structure.edges
            },
            navigationRules: structure.navigationRules,
            entryPoint: Object.keys(structure.nodes)[0],
            exitPoint: rendering.exitElement.id
        });

        dn = {
            structure,
            input,
            rendering
        };
        window.dn = dn
        return dn;
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

})();

/******/ })()
;