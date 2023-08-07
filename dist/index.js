/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 772:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Fg": () => (/* binding */ defaultDirections),
/* harmony export */   "YY": () => (/* binding */ NodeElementDefaults),
/* harmony export */   "_4": () => (/* binding */ defaultKeyBindings)
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

const defaultDirections = {
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
    let directions = _consts__WEBPACK_IMPORTED_MODULE_0__/* .defaultDirections */ .Fg;

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
            directions = _consts__WEBPACK_IMPORTED_MODULE_0__/* .defaultDirections */ .Fg;
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
const structure = StructureOptions => {
    if (
        StructureOptions.inputType === 'vega-lite' ||
        StructureOptions.inputType === 'vl' ||
        StructureOptions.inputType === 'Vega-Lite'
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
    let nodes = {};
    let edges = {};
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
        nodes,
        edges
    };
};

const buildNodeStructure = options => {
    // this will eventually be our generic method for dn.structure()

    // need to convert to a graph structure!

    return {};
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
/* unused harmony exports stateHandler, dataNavigator */
/* harmony import */ var _structure__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(36);
/* harmony import */ var _input__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(674);
/* harmony import */ var _rendering__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(949);




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
    structure: _structure__WEBPACK_IMPORTED_MODULE_2__/* .structure */ .Fh,
    input: _input__WEBPACK_IMPORTED_MODULE_0__/* .input */ .q,
    rendering: _rendering__WEBPACK_IMPORTED_MODULE_1__/* .rendering */ .n
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

})();

/******/ })()
;