/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 312:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NodeElementDefaults = exports.GenericLimitedNavigationRules = exports.GenericFullNavigationPairs = exports.GenericFullNavigationDimensions = exports.GenericFullNavigationRules = exports.defaultKeyBindings = void 0;
exports.defaultKeyBindings = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    Period: 'forward',
    Comma: 'backward',
    Escape: 'parent',
    Enter: 'child'
};
exports.GenericFullNavigationRules = {
    down: {
        key: 'ArrowDown',
        direction: 'target'
    },
    left: {
        key: 'ArrowLeft',
        direction: 'source'
    },
    right: {
        key: 'ArrowRight',
        direction: 'target'
    },
    up: {
        key: 'ArrowUp',
        direction: 'source'
    },
    backward: {
        key: 'Comma',
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
    forward: {
        key: 'Period',
        direction: 'target'
    },
    exit: {
        key: 'Escape',
        direction: 'target'
    },
    undo: {
        key: 'KeyZ',
        direction: 'target'
    }
};
exports.GenericFullNavigationDimensions = [
    ['left', 'right'],
    ['up', 'down'],
    ['backward', 'forward'],
    ['previous', 'next']
];
exports.GenericFullNavigationPairs = {
    left: ['left', 'right'],
    right: ['left', 'right'],
    up: ['up', 'down'],
    down: ['up', 'down'],
    backward: ['backward', 'forward'],
    forward: ['backward', 'forward'],
    previous: ['previous', 'next'],
    next: ['previous', 'next'],
    parent: ['parent', 'child'],
    child: ['parent', 'child'],
    exit: ['exit', 'undo'],
    undo: ['undo', 'undo']
};
exports.GenericLimitedNavigationRules = {
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
};
exports.NodeElementDefaults = {
    cssClass: '',
    spatialProperties: {
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
        useForSpatialProperties: false,
        spatialProperties: undefined
    }
};


/***/ }),

/***/ 607:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
var structure_1 = __webpack_require__(4);
var input_1 = __webpack_require__(489);
var rendering_1 = __webpack_require__(992);
exports.Z = { structure: structure_1.default, input: input_1.default, rendering: rendering_1.default };


/***/ }),

/***/ 489:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var consts_1 = __webpack_require__(312);
exports["default"] = (function (options) {
    var inputHandler = {};
    var keyBindings = consts_1.defaultKeyBindings;
    var directions = consts_1.GenericFullNavigationRules;
    inputHandler.moveTo = function (id) {
        // console.log('moveTo', id);
        var target = options.structure.nodes[id];
        // console.log('target', target);
        if (target) {
            return target;
        }
        return;
    };
    inputHandler.move = function (currentFocus, direction) {
        if (currentFocus) {
            var d_1 = options.structure.nodes[currentFocus];
            if (d_1.edges) {
                var target_1 = null;
                var i = 0;
                var navRule_1 = directions[direction];
                if (!navRule_1) {
                    return;
                }
                var findTarget_1 = function (rule, edge) {
                    if (!(rule === direction)) {
                        return null;
                    }
                    var resolvedNodes = {
                        target: typeof edge.target === 'string' ? edge.target : edge.target(d_1, currentFocus),
                        source: typeof edge.source === 'string' ? edge.source : edge.source(d_1, currentFocus)
                    };
                    return !(resolvedNodes[navRule_1.direction] === currentFocus)
                        ? resolvedNodes[navRule_1.direction]
                        : null;
                };
                var _loop_1 = function () {
                    var edge = options.structure.edges[d_1.edges[i]];
                    // if (Array.isArray(types)) {
                    edge.navigationRules.forEach(function (rule) {
                        if (!target_1) {
                            target_1 = findTarget_1(rule, edge);
                        }
                    });
                    // } else {
                    //     target = verifyEdge(types, edge);
                    // }
                    if (target_1) {
                        return "break";
                    }
                };
                for (i = 0; i < d_1.edges.length; i++) {
                    var state_1 = _loop_1();
                    if (state_1 === "break")
                        break;
                }
                if (target_1) {
                    return inputHandler.moveTo(target_1);
                }
                return undefined;
            }
        }
    };
    inputHandler.enter = function () {
        if (options.entryPoint) {
            return inputHandler.moveTo(options.entryPoint);
        }
        else {
            console.error('No entry point was specified in InputOptions, returning undefined');
            return;
        }
    };
    inputHandler.exit = function () {
        if (options.exitPoint) {
            return options.exitPoint;
        }
        else {
            console.error('No exit point was specified in InputOptions, returning undefined');
            return;
        }
    };
    inputHandler.keydownValidator = function (e) {
        var direction = keyBindings[e.code];
        if (direction) {
            return direction;
        }
    };
    inputHandler.focus = function (renderId) {
        var node = document.getElementById(renderId);
        if (node) {
            node.focus();
        }
    };
    inputHandler.setNavigationKeyBindings = function (navKeyBindings) {
        if (!navKeyBindings) {
            keyBindings = consts_1.defaultKeyBindings;
            directions = consts_1.GenericFullNavigationRules;
        }
        else {
            keyBindings = {};
            directions = navKeyBindings;
            Object.keys(navKeyBindings).forEach(function (direction) {
                var navOption = navKeyBindings[direction];
                keyBindings[navOption.key] = direction;
            });
            console.log("navKeyBindings", navKeyBindings);
            console.log("keyBindings", keyBindings);
        }
    };
    inputHandler.setNavigationKeyBindings(options.navigationRules);
    return inputHandler;
});


/***/ }),

/***/ 992:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var consts_1 = __webpack_require__(312);
exports["default"] = (function (options) {
    var setActiveDescendant = function (e) {
        renderer.wrapper.setAttribute('aria-activedescendant', e.srcElement.id);
    };
    var removeActiveDescendant = function () {
        renderer.wrapper.setAttribute('aria-activedescendant', '');
    };
    var renderer = {};
    var initialized = false;
    var defaults = {
        cssClass: consts_1.NodeElementDefaults.cssClass,
        spatialProperties: __assign({}, consts_1.NodeElementDefaults.spatialProperties),
        semantics: __assign({}, consts_1.NodeElementDefaults.semantics),
        parentSemantics: __assign({}, consts_1.NodeElementDefaults.parentSemantics),
        existingElement: __assign({}, consts_1.NodeElementDefaults.existingElement)
    };
    if (options.defaults) {
        defaults.cssClass = options.defaults.cssClass || defaults.cssClass;
        defaults.spatialProperties = options.defaults.spatialProperties
            ? __assign(__assign({}, defaults.spatialProperties), options.defaults.spatialProperties) : defaults.spatialProperties;
        defaults.semantics = options.defaults.semantics
            ? __assign(__assign({}, defaults.semantics), options.defaults.semantics) : defaults.semantics;
        defaults.parentSemantics = options.defaults.parentSemantics
            ? __assign(__assign({}, defaults.parentSemantics), options.defaults.parentSemantics) : defaults.parentSemantics;
        defaults.existingElement = options.defaults.existingElement
            ? __assign(__assign({}, defaults.existingElement), options.defaults.existingElement) : defaults.existingElement;
    }
    renderer.initialize = function () {
        var _a;
        if (initialized) {
            console.error("The renderer wrapper has already been initialized successfully, RenderingOptions.suffixId is: ".concat(options.suffixId, ". No further action was taken."));
            return;
        }
        if (options.root && document.getElementById(options.root.id)) {
            renderer.root = document.getElementById(options.root.id);
        }
        else {
            console.error('No root element found, cannot build: RenderingOptions.root.id must reference an existing DOM element in order to render children.');
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
        renderer.wrapper.setAttribute('role', 'application');
        renderer.wrapper.setAttribute('aria-label', options.root.description || 'Data navigation structure');
        renderer.wrapper.setAttribute('aria-activedescendant', '');
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
            renderer.entryButton.innerText = "Enter navigation area";
            if (options.entryButton.callbacks && options.entryButton.callbacks.click) {
                renderer.entryButton.addEventListener('click', options.entryButton.callbacks.click);
            }
            if (options.entryButton.callbacks && options.entryButton.callbacks.focus) {
                renderer.entryButton.addEventListener('focus', options.entryButton.callbacks.focus);
            }
            renderer.wrapper.appendChild(renderer.entryButton);
        }
        renderer.root.appendChild(renderer.wrapper);
        if ((_a = options.exitElement) === null || _a === void 0 ? void 0 : _a.include) {
            renderer.exitElement = document.createElement('div');
            renderer.exitElement.id = 'dn-exit-' + options.suffixId;
            renderer.exitElement.classList.add('dn-exit-position');
            renderer.exitElement.innerText = "End of data structure.";
            renderer.exitElement.setAttribute('aria-label', "End of data structure.");
            renderer.exitElement.setAttribute('role', 'note');
            renderer.exitElement.setAttribute('tabindex', '-1');
            renderer.exitElement.style.display = 'none';
            renderer.exitElement.addEventListener('focus', function (e) {
                var _a, _b;
                renderer.exitElement.style.display = 'block';
                renderer.clearStructure();
                if ((_b = (_a = options.exitElement) === null || _a === void 0 ? void 0 : _a.callbacks) === null || _b === void 0 ? void 0 : _b.focus) {
                    options.exitElement.callbacks.focus(e);
                }
            });
            renderer.exitElement.addEventListener('blur', function (e) {
                var _a, _b;
                renderer.exitElement.style.display = 'none';
                if ((_b = (_a = options.exitElement) === null || _a === void 0 ? void 0 : _a.callbacks) === null || _b === void 0 ? void 0 : _b.blur) {
                    options.exitElement.callbacks.blur(e);
                }
            });
            renderer.root.appendChild(renderer.exitElement);
        }
        initialized = true;
        return renderer.root;
    };
    renderer.render = function (nodeData) {
        var id = nodeData.renderId + '';
        var d = options.elementData[id];
        if (!d) {
            console.warn("Render data not found with renderId: ".concat(id, ". Failed to render."));
            return;
        }
        if (!initialized) {
            console.error('render() was called before initialize(), renderer must be initialized first.');
            return;
        }
        var useExisting = false;
        var existingSpatialProperties = {};
        var resolveProp = function (prop, subprop, checkExisting) {
            var p1 = d[prop] || defaults[prop];
            var s1 = !(checkExisting && useExisting) ? p1[subprop] : existingSpatialProperties[subprop];
            var s2 = defaults[prop][subprop];
            return typeof p1 === 'function'
                ? p1(d, nodeData.datum)
                : typeof s1 === 'function'
                    ? s1(d, nodeData.datum)
                    : s1 || s2 || (!subprop ? p1 : undefined);
        };
        useExisting = resolveProp('existingElement', 'useForSpatialProperties');
        existingSpatialProperties = resolveProp('existingElement', 'spatialProperties');
        var width = parseFloat(resolveProp('spatialProperties', 'width', true) || 0);
        var height = parseFloat(resolveProp('spatialProperties', 'height', true) || 0);
        var x = parseFloat(resolveProp('spatialProperties', 'x', true) || 0);
        var y = parseFloat(resolveProp('spatialProperties', 'y', true) || 0);
        var node = document.createElement(resolveProp('parentSemantics', 'elementType'));
        var wrapperAttrs = resolveProp('parentSemantics', 'attributes');
        if (typeof wrapperAttrs === 'object') {
            Object.keys(wrapperAttrs).forEach(function (wrapperAttr) {
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
        node.setAttribute('tabindex', '0');
        node.addEventListener('focus', setActiveDescendant);
        node.addEventListener('blur', removeActiveDescendant);
        var nodeText = document.createElement(resolveProp('semantics', 'elementType'));
        var attributes = resolveProp('semantics', 'attributes');
        if (typeof attributes === 'object') {
            Object.keys(attributes).forEach(function (attribute) {
                node.setAttribute(attribute, attributes[attribute]);
            });
        }
        nodeText.setAttribute('role', resolveProp('semantics', 'role'));
        nodeText.classList.add('dn-node-text');
        if (d.showText) {
            nodeText.innerText = d.semantics.label;
        }
        var label = resolveProp('semantics', 'label');
        if (!label) {
            console.error('Accessibility error: a label must be supplied to every rendered element using semantics.label.');
        }
        nodeText.setAttribute('aria-label', label);
        node.appendChild(nodeText);
        var hasPath = resolveProp('spatialProperties', 'path');
        if (hasPath) {
            var totalWidth = width + x + 10;
            var totalHeight = height + y + 10;
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', totalWidth + '');
            svg.setAttribute('height', totalHeight + '');
            svg.setAttribute('viewBox', "0 0 ".concat(totalWidth, " ").concat(totalHeight));
            svg.style.left = -x + 'px';
            svg.style.top = -y + 'px';
            svg.classList.add('dn-node-svg');
            svg.setAttribute('role', 'presentation');
            svg.setAttribute('focusable', 'false');
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', hasPath);
            path.classList.add('dn-node-path');
            svg.appendChild(path);
            node.appendChild(svg);
        }
        renderer.wrapper.appendChild(node);
        return node;
    };
    renderer.remove = function (renderId) {
        console.log(renderer.root);
        var node = document.getElementById(renderId);
        if (renderer.wrapper.getAttribute('aria-activedescendant') === renderId) {
            renderer.wrapper.setAttribute('aria-activedescendant', '');
        }
        if (node) {
            node.removeEventListener('focus', setActiveDescendant);
            node.removeEventListener('blur', removeActiveDescendant);
            node.remove();
        }
    };
    renderer.clearStructure = function () {
        __spreadArray([], renderer.wrapper.children, true).forEach(function (child) {
            if (!(renderer.entryButton && renderer.entryButton === child)) {
                renderer.remove(child.id);
            }
        });
    };
    return renderer;
});


/***/ }),

/***/ 4:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildStructure = exports.buildRules = exports.buildEdges = exports.scaffoldDimensions = exports.bulidNodes = exports.addSimpleDataIDs = exports.createValidId = exports.buildNodeStructureFromVegaLite = void 0;
var consts_1 = __webpack_require__(312);
var utilities_1 = __webpack_require__(5);
exports["default"] = (function (options) {
    if (options.dataType === 'vega-lite' || options.dataType === 'vl' || options.dataType === 'Vega-Lite') {
        return (0, exports.buildNodeStructureFromVegaLite)(options);
    }
    else {
        return (0, exports.buildStructure)(options);
    }
});
var buildNodeStructureFromVegaLite = function (options) {
    var navigationRules = consts_1.GenericLimitedNavigationRules;
    var nodes = {};
    var edges = {};
    var elementData = {};
    var total = 0;
    var includeGroup = options.groupInclusionCriteria ? options.groupInclusionCriteria : function () { return true; };
    var includeItem = options.itemInclusionCriteria ? options.itemInclusionCriteria : function () { return true; };
    var includeDataProperties = options.datumInclusionCriteria ? options.datumInclusionCriteria : function () { return true; };
    var offset = options.vegaLiteView._renderer._origin;
    var groupParent = options.vegaLiteView._scenegraph.root.items[0].mark.items[0];
    var idBuilder = function (i, level) {
        // const item = it.mark || it
        if (i['data-navigator-id']) {
            return i['data-navigator-id'];
        }
        var id = "dn-node-".concat(level, "-").concat(total); // (item.name || '') + (item.role || '') + (item.marktype || '') + total
        total++;
        i['data-navigator-id'] = id;
        return id;
    };
    var edgeBuilder = function (id) {
        var node = nodes[id];
        var index = node.index;
        var level = node.level;
        var parent = node.parent;
        var edgeList = [];
        // previous and next use parent.items[]
        var previous = parent.items[index - 1];
        if (previous) {
            var previousId = idBuilder(previous, level);
            if (nodes[previousId]) {
                var previousEdge = "".concat(previousId, "-").concat(node.id);
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
        var next = parent.items[index + 1];
        if (next) {
            var nextId = idBuilder(next, level);
            if (nodes[nextId]) {
                var nextEdge = "".concat(node.id, "-").concat(nextId);
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
            var g = parent.items[index].items[0].mark.items[0].items || parent.items[index].items;
            // first child
            var firstChild = g[0];
            var firstChildId = idBuilder(firstChild, 'item');
            if (nodes[firstChildId]) {
                var firstChildEdge = "".concat(node.id, "-").concat(firstChildId);
                edgeList.push(firstChildEdge);
                if (!edges[firstChildEdge]) {
                    edges[firstChildEdge] = {
                        source: node.id,
                        target: firstChildId,
                        navigationRules: ['parent', 'child']
                    };
                }
            }
        }
        else if (level === 'item') {
            // parent
            var parentId = idBuilder(parent, 'group');
            if (nodes[parentId]) {
                var parentEdge = "".concat(parentId, "-").concat(node.id);
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
    var nodeBuilder = function (item, level, offset, index, parent) {
        var id = idBuilder(item, level);
        var renderId = 'render-' + id;
        var o = offset || [0, 0];
        nodes[id] = {};
        nodes[id].d = {};
        nodes[id].id = id;
        nodes[id].renderId = renderId;
        nodes[id].index = index;
        nodes[id].level = level;
        nodes[id].parent = parent;
        elementData[renderId] = {};
        elementData[renderId].renderId = renderId;
        elementData[renderId].spatialProperties = {};
        elementData[renderId].spatialProperties.x = item.bounds.x1 + o[0];
        elementData[renderId].spatialProperties.y = item.bounds.y1 + o[1];
        elementData[renderId].spatialProperties.width = item.bounds.x2 - item.bounds.x1;
        elementData[renderId].spatialProperties.height = item.bounds.y2 - item.bounds.y1;
        elementData[renderId].cssClass = 'dn-vega-lite-node';
        if (item.datum) {
            Object.keys(item.datum).forEach(function (key) {
                var value = item.datum[key];
                if (includeDataProperties(key, value, item.datum, level, options.vegaLiteSpec)) {
                    nodes[id].d[options.keyRenamingHash && options.keyRenamingHash[key] ? options.keyRenamingHash[key] : key] = value;
                }
            });
        }
        elementData[renderId].semantics = {};
        elementData[renderId].semantics.label = options.nodeDescriber
            ? options.nodeDescriber(nodes[id].d, item, level)
            : (0, utilities_1.describeNode)(nodes[id].d);
    };
    var i = 0;
    var groups = groupParent.items;
    groups.forEach(function (group) {
        if (includeGroup(group, i, options.vegaLiteSpec)) {
            nodeBuilder(group, 'group', offset, i, groupParent);
            var j_1 = 0;
            var g_1 = group.items[0].mark.items[0].items ? group.items[0].mark.items[0] : group;
            g_1.items.forEach(function (item) {
                if (includeItem(item, j_1, group, options.vegaLiteSpec)) {
                    nodeBuilder(item, 'item', offset, j_1, g_1);
                }
                j_1++;
            });
        }
        i++;
    });
    Object.keys(nodes).forEach(function (n) {
        nodes[n].edges = edgeBuilder(n);
    });
    return {
        nodes: nodes,
        edges: edges,
        elementData: elementData,
        navigationRules: navigationRules
    };
};
exports.buildNodeStructureFromVegaLite = buildNodeStructureFromVegaLite;
var createValidId = function (s) {
    // We start the string with an underscore, then replace all invalid characters with underscores
    return '_' + s.replace(/[^a-zA-Z0-9_-]+/g, '_');
};
exports.createValidId = createValidId;
/*
    this function creates an index for every datum in options.data,
    adds that index to the datum (mutating the datum directly),
    optionally can count the number of times a datum's keys have
    already been seen in other datum, and will also (if a string),
    count the number of times the value of that key has been seen
*/
var addSimpleDataIDs = function (options) {
    var i = 0;
    var keyCounter = {};
    options.data.forEach(function (d) {
        var id = typeof options.idKey === 'function' ? options.idKey(d) : options.idKey;
        d[id] = '_' + i;
        if (options.keysForIdGeneration) {
            options.keysForIdGeneration.forEach(function (k) {
                if (k in d) {
                    if (typeof d[k] === 'string') {
                        if (!keyCounter[k]) {
                            keyCounter[k] = 0;
                        }
                        if (!keyCounter[d[k]]) {
                            keyCounter[d[k]] = 0;
                        }
                        d[id] += '_' + k + keyCounter[k] + '_' + d[k] + keyCounter[d[k]];
                        keyCounter[k]++;
                        keyCounter[d[k]]++;
                    }
                    else {
                        if (!keyCounter[k]) {
                            keyCounter[k] = 0;
                        }
                        d[id] += '_' + k + keyCounter[k];
                        keyCounter[k]++;
                    }
                }
            });
        }
        i++;
    });
};
exports.addSimpleDataIDs = addSimpleDataIDs;
// need lifecycle stuff for this (add/remove/etc) - this will be hard to do well!
/*
    This function creates a node for every relation type as well as a node
*/
var bulidNodes = function (options) {
    var nodes = {};
    // this will eventually be our generic method for dn.structure()
    // convert all data to a graph structure!
    options.data.forEach(function (d) {
        if (!options.idKey) {
            console.error("Building nodes. A key string must be supplied in options.idKey to specify the id keys of every node.");
        }
        var idKey = typeof options.idKey === 'function' ? options.idKey(d) : options.idKey;
        var id = d[idKey];
        if (!id) {
            console.error("Building nodes. Each datum in options.data must contain an id. When matching the id key string ".concat(idKey, ", this datum has no id: ").concat(JSON.stringify(d), "."));
            return;
        }
        if (!nodes[id]) {
            var renderIdKey = typeof options.renderIdKey === 'function' ? options.renderIdKey(d) : options.renderIdKey;
            nodes[id] = {
                id: id,
                edges: [],
                renderId: renderIdKey ? d[renderIdKey] || '' : d.renderIdKey || '',
                data: d
            };
        }
        else {
            console.error("Building nodes. Each id for data in options.data must be unique. This id is not unique: ".concat(id, "."));
            return;
        }
    });
    return nodes;
};
exports.bulidNodes = bulidNodes;
/*
    dimensions : [
        {
            "type": "categorical" | "numerical", // if type is missing, then derive based on first datum
            "name": "", //optional, will use key if missing
            "key": "", // required
            "nestedSettings": {
                "derivedParent": boolean,
                "parentNode": {
                    "id": (d, s) : string =>{} | string | undefined, // if derived is false, id is required, if derived is true and id is empty or undefined, then id will be generated
                    "rendering": {
                        "renderId": "",
                        "strategy": "outlineEach" | "convexHull" | "singleSquare"
                    }
                } | undefined // if nestedSettings.nested is true, then parentNode is required
            },
            "sortingFunction": (a, b, dimension) : boolean => { return a < b}, // optional, will use data order if missing (for categorical) or use numerical order if missing (for numerical)
        }
    ]

    Step 1: create list of all elements, order them based on sorting
    Step 2: divide/sub-divide

    name: cats
        subdivide "animal", filter for only cat
    name: dogs
        subdivide "animal", filter for only dog

    dimension: {
        type: "categorical" | "numerical",
        nodeId?: string | (dimensionKey, data) => string,
        dimensionKey: "",
        navigationRules: {
            sibling_sibling: ["left", "right"], // | ["up", "down"], ["forward","backward"], ["previous","next"]
            parent_child: ["category", "child"]
        },
        operations: {
            deriveRoot: boolean,
            deriveParents: boolean,
            rootId?: (dimensionKey, data) => string,
            parentIds?: (dimensionKey, keyValue, i) => string,
            filterFunction?: (d,dimensionKey) => boolean,
            sortFunction?: (a,b,dimensionKey) => number, // by default sorts numerical in ascending, does not sort categorical
            createNumericalSubdivisions?: number | (dimensionKey,dimData) => number, (defaults to 1)
        }
    }
        => {
            dimensionKey: "category",
            nodeId: "category1",
            type: "categorical",
            navigationRules: {
                sibling_sibling: ["left", "right"], // | ["up", "down"], ["forward","backward"], ["previous","next"]
                parent_child: ["category","child"]
            },
            divisions: [ // if only 1 division, then the root === the parent?
                {
                    id: "category-a",
                    values: [{id: "category-a-1"}, {id: "category-a-2"}, {id: "category-a-3"}]
                },
                {
                    id: "category-b",
                    values: [{id: "category-b-1"}, {id: "category-a-2"}, {id: "category-a-3"}]
                }
            ]
        }
*/
// if 0 dimensions, then create a dimension of all the data in a single list?
// if only 1 division, then the root === the parent?
var scaffoldDimensions = function (options, nodes) {
    var dimensions = {};
    var rules = __spreadArray([], consts_1.GenericFullNavigationDimensions, true);
    var setExtents = function (val, dim) {
        var min = dim.numericalExtents[0];
        var max = dim.numericalExtents[1];
        dim.numericalExtents[0] = min < val ? min : val;
        dim.numericalExtents[1] = max > val ? max : val;
    };
    // for every datum, check against filters, create parent dimensions, create divisions, and then add to divisions
    options.data.forEach(function (d) {
        var ods = options.dimensions.values || [];
        var i = 0;
        ods.forEach(function (dim) {
            var _a, _b, _c, _d, _e, _f, _g;
            if (!dim.dimensionKey) {
                console.error("Building nodes, parsing dimensions. Each dimension in options.dimensions must contain a dimensionKey. This dimension has no key: ".concat(JSON.stringify(dim), "."));
                return;
            }
            if (dim.dimensionKey in d) {
                var value = d[dim.dimensionKey];
                // we need to check against our filter function to see if we keep this value
                var keepValue = typeof ((_a = dim.operations) === null || _a === void 0 ? void 0 : _a.filterFunction) === 'function' ? dim.operations.filterFunction(d, dim) : true;
                // currently we are not imputing, so if a value is undefined we will skip it
                // null, 0, "", and other falsy values are fine for now, but could be validated later
                if (value !== undefined && keepValue) {
                    if (!dim.type) {
                        // we mutate our input + assign the type if it doesn't exist, since we are going to need it
                        dim.type = typeof value === 'bigint' || typeof value === 'number' ? 'numerical' : 'categorical';
                    }
                    // if (dim.operations.aggregate) {
                    // want some way to aggregate here across the dimension
                    // we need an easy way to create lists as well as calculate
                    // }
                    // step 1: create dimension if it hasn't been made yet!
                    if (!dimensions[dim.dimensionKey]) {
                        var id_1 = typeof dim.nodeId === 'function'
                            ? dim.nodeId(dim, options.data)
                            : dim.nodeId || (0, exports.createValidId)(dim.dimensionKey);
                        var renderId = typeof dim.renderId === 'function' ? dim.renderId(dim, options.data) : dim.renderId || id_1;
                        // this is the dimension
                        dimensions[dim.dimensionKey] = {
                            dimensionKey: dim.dimensionKey,
                            nodeId: id_1,
                            divisions: {},
                            numericalExtents: [Infinity, -Infinity],
                            type: dim.type,
                            sortFunction: ((_b = dim.operations) === null || _b === void 0 ? void 0 : _b.sortFunction) || undefined,
                            behavior: dim.behavior || {
                                extents: 'circular'
                            },
                            navigationRules: dim.navigationRules || {
                                sibling_sibling: rules.length
                                    ? __spreadArray([], rules.shift(), true) : ['previous_' + dim.dimensionKey, 'next_' + dim.dimensionKey],
                                parent_child: ['parent_' + dim.dimensionKey, 'child']
                            }
                        };
                        // we want to add a node for the dimension's root
                        nodes[id_1] = {
                            id: id_1,
                            renderId: renderId,
                            derivedNode: dim.dimensionKey,
                            edges: [],
                            data: dimensions[dim.dimensionKey],
                            renderingStrategy: dim.renderingStrategy || 'singleSquare' // not sure what defaults we want yet
                        };
                    }
                    var dimension = dimensions[dim.dimensionKey];
                    var targetDivision = null;
                    // step 2: if this is categorical, we check if value's division exists (if not, we make it)
                    if (dim.type === 'categorical') {
                        var divisionId = typeof ((_c = dim.divisionOptions) === null || _c === void 0 ? void 0 : _c.divisionNodeIds) === 'function'
                            ? dim.divisionOptions.divisionNodeIds(dim.dimensionKey, value, i)
                            : dimension.nodeId + '_' + value;
                        targetDivision = dimension.divisions[divisionId];
                        if (!targetDivision) {
                            targetDivision = dimension.divisions[divisionId] = {
                                id: divisionId,
                                sortFunction: ((_d = dim.divisionOptions) === null || _d === void 0 ? void 0 : _d.sortFunction) || undefined,
                                values: {}
                            };
                            var divisionRenderId = typeof ((_e = dim.divisionOptions) === null || _e === void 0 ? void 0 : _e.divisionRenderIds) === 'function'
                                ? dim.divisionOptions.divisionRenderIds(dim.dimensionKey, value, i)
                                : divisionId;
                            nodes[divisionId] = {
                                id: divisionId,
                                renderId: divisionRenderId,
                                derivedNode: dim.dimensionKey,
                                edges: [],
                                data: __assign({}, targetDivision),
                                renderingStrategy: ((_f = dim.divisionOptions) === null || _f === void 0 ? void 0 : _f.renderingStrategy) || 'singleSquare' // not sure what defaults we want yet
                            };
                            nodes[divisionId].data[dim.dimensionKey] = value;
                        }
                    }
                    else {
                        // if this isn't categorical, we create a generic division (for now) and will split later
                        targetDivision = dimension.divisions[dimension.nodeId];
                        if (!targetDivision) {
                            targetDivision = dimension.divisions[dimension.nodeId] = {
                                id: dimension.nodeId,
                                sortFunction: ((_g = dim.divisionOptions) === null || _g === void 0 ? void 0 : _g.sortFunction) || undefined,
                                values: {}
                            };
                        }
                        // step 3: if numerical, keep track of min/max as we go so we can create divisions after this loop
                        // we then need to start checking extents!
                        // first, we need to check if operations exist, otherwise we need to make it
                        if (!dim.operations) {
                            dim.operations = {};
                        }
                        // we need to make sure operations' numericalSubdivisions at least has a valid value
                        // subdivs can be a function or number, but if it is a number, we coerce it into 1 or greater
                        var subdivs = dim.operations.createNumericalSubdivisions;
                        dimension.subdivisions = typeof subdivs === 'number' && subdivs < 1 ? 1 : subdivs || 1;
                        if (subdivs !== 1) {
                            if (!dimension.divisionOptions) {
                                dimension.divisionOptions = dim.divisionOptions;
                            }
                            // gotta check those min/max in case we need to split!
                            // however, if we aren't splitting then we don't need to check
                            setExtents(value, dimension);
                        }
                    }
                    // step 4: add value to target division
                    var id = typeof options.idKey === 'function' ? options.idKey(d) : options.idKey;
                    targetDivision.values[d[id]] = d;
                }
            }
            i++;
        });
    });
    // create division points using min and max (if numerical)
    // sort the dimensions' divisions
    Object.keys(dimensions).forEach(function (s) {
        var _a, _b, _c, _d;
        var dimension = dimensions[s];
        var divisions = dimension.divisions;
        if (dimension.type === 'numerical') {
            // we want to sort ALL the values if it is numerical
            divisions[dimension.nodeId].values = Object.fromEntries(Object.entries(divisions[dimension.nodeId].values).sort(function (a, b) {
                return typeof dimension.sortFunction === 'function'
                    ? dimension.sortFunction(a[1], b[1], dimension)
                    : a[1][s] - b[1][s];
            }));
            var values = divisions[dimension.nodeId].values;
            // we need to create subdivisions and remove the original
            if (dimension.numericalExtents[0] !== Infinity && dimension.subdivisions !== 1) {
                var valueKeys = Object.keys(values);
                var subDivisions = typeof dimension.subdivisions === 'function'
                    ? dimension.subdivisions(s, values)
                    : dimension.subdivisions;
                var range = dimension.numericalExtents[1] - dimension.numericalExtents[0];
                var interval = range / subDivisions;
                var i = dimension.numericalExtents[0] + interval;
                var divisionCount = 0;
                var index = 0;
                for (i = dimension.numericalExtents[0] + interval; i <= dimension.numericalExtents[1]; i += interval) {
                    // first, we create each subdivision
                    var divisionId = typeof ((_a = dimension.divisionOptions) === null || _a === void 0 ? void 0 : _a.divisionNodeIds) === 'function'
                        ? dimension.divisionOptions.divisionNodeIds(s, i, i)
                        : dimension.nodeId + '_' + i;
                    dimension.divisions[divisionId] = {
                        id: divisionId,
                        sortFunction: ((_b = dimension.divisionOptions) === null || _b === void 0 ? void 0 : _b.sortFunction) || undefined,
                        values: {}
                    };
                    var divisionRenderId = typeof ((_c = dimension.divisionOptions) === null || _c === void 0 ? void 0 : _c.divisionRenderIds) === 'function'
                        ? dimension.divisionOptions.divisionRenderIds(s, i, i)
                        : divisionId;
                    // we want to make a node for these subdivisions
                    nodes[divisionId] = {
                        id: divisionId,
                        renderId: divisionRenderId,
                        derivedNode: s,
                        edges: [],
                        data: dimension.divisions[divisionId],
                        renderingStrategy: ((_d = dimension.divisionOptions) === null || _d === void 0 ? void 0 : _d.renderingStrategy) || 'singleSquare' // not sure what defaults we want yet
                    };
                    var limit = false;
                    while (!limit && index < valueKeys.length) {
                        var node = values[valueKeys[index]];
                        var value = node[s];
                        if (value <= i) {
                            dimension.divisions[divisionId].values[node.id] = node;
                        }
                        else {
                            i += interval;
                            limit = true;
                        }
                        index++;
                    }
                    divisionCount++;
                }
                delete divisions[s];
            }
        }
        else if (typeof dimension.sortFunction === 'function') {
            // otherwise, we sort the keys of the categorical divisions
            dimension.divisions = Object.fromEntries(Object.entries(divisions).sort(function (a, b) {
                return dimension.sortFunction(a[1], b[1], dimension);
            }));
        }
        // if sub-division sorting functions are passed, we can run those now
        var divisionKeys = Object.keys(dimension.divisions);
        divisionKeys.forEach(function (d) {
            var division = dimension.divisions[d];
            if (typeof division.sortFunction === 'function') {
                division.values = Object.fromEntries(Object.entries(division.values).sort(function (a, b) {
                    return dimension.sortFunction(a[1], b[1], division);
                }));
            }
        });
    });
    if (options.dimensions.adjustDimensions) {
        dimensions = options.dimensions.adjustDimensions(dimensions);
    }
    return dimensions;
};
exports.scaffoldDimensions = scaffoldDimensions;
var buildEdges = function (options, nodes, dimensions) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    var edges = {};
    var createEdge = function (source, target, rules) {
        var _a;
        var id = "".concat(source, "-").concat(target);
        // create edge object
        if (edges[id] && rules) {
            (_a = edges[id].navigationRules).push.apply(_a, rules);
        }
        else {
            edges[id] = {
                source: source,
                target: target,
                navigationRules: rules ? __spreadArray([], rules, true) : []
            };
        }
        // add edgeId to source and target's edges
        if (nodes[source].edges.indexOf(id) === -1) {
            nodes[source].edges.push(id);
        }
        if (nodes[target].edges.indexOf(id) === -1) {
            nodes[target].edges.push(id);
        }
    };
    if (dimensions && Object.keys(dimensions).length) {
        var dimensionKeys = Object.keys(dimensions);
        var hasOrder_1 = (_c = (_b = (_a = options.dimensions) === null || _a === void 0 ? void 0 : _a.parentOptions) === null || _b === void 0 ? void 0 : _b.level1Options) === null || _c === void 0 ? void 0 : _c.order;
        var order_1 = hasOrder_1 || dimensionKeys;
        var l_1 = 0;
        var po_1 = ((_d = options.dimensions) === null || _d === void 0 ? void 0 : _d.parentOptions) || {};
        var extents_1 = ((_f = (_e = po_1.level1Options) === null || _e === void 0 ? void 0 : _e.behavior) === null || _f === void 0 ? void 0 : _f.extents) || 'terminal';
        var level0_1 = po_1.addLevel0;
        var parentRules_1 = level0_1
            ? ((_h = (_g = po_1.level1Options) === null || _g === void 0 ? void 0 : _g.navigationRules) === null || _h === void 0 ? void 0 : _h.parent_child) || ['parent', 'child']
            : [];
        var siblingRules_1 = ((_k = (_j = po_1.level1Options) === null || _j === void 0 ? void 0 : _j.navigationRules) === null || _k === void 0 ? void 0 : _k.sibling_sibling) || ['left', 'right'];
        var firstLevel1Node_1 = typeof order_1[0] === 'string' ? (hasOrder_1 ? nodes[order_1[0]] : nodes[dimensions[order_1[0]].nodeId]) : order_1[0];
        if (level0_1) {
            // we make a way for the level0 to go to the first child
            createEdge(level0_1.id, firstLevel1Node_1.id, parentRules_1);
        }
        order_1.forEach(function (n) {
            var level1Node = typeof n === 'string' ? (hasOrder_1 ? nodes[n] : nodes[dimensions[n].nodeId]) : n;
            if (level1Node === n && !nodes[level1Node.id]) {
                // since the order list allows creation of nodes at level 1, we add them here if passed in and not already part of nodes
                nodes[level1Node.id] = level1Node;
            }
            // the first thing that every dimension needs is a connection to the level0 node, if it exists
            if (level0_1) {
                createEdge(level1Node.id, level0_1.id, parentRules_1);
            }
            if (l_1 === order_1.length - 1 && extents_1 === 'circular') {
                // we are at the end, create forwards loop to start of list
                createEdge(level1Node.id, firstLevel1Node_1.id, siblingRules_1);
            }
            else if (l_1 === order_1.length - 1 && extents_1 === 'bridgedCustom') {
                // we are at the end, create forwards bridge to new element
                createEdge(level1Node.id, po_1.level1Options.behavior.customBridgePost, siblingRules_1);
            }
            else if (l_1 < order_1.length - 1) {
                // we are in level1 but not at the end, create forwards step
                // @ts-ignore: for some reason the same use of conditional check works above for order[0] (firstLevel1Node) but not for l+1 here
                var nextLevel1Node = typeof order_1[l_1 + 1] === 'string'
                    ? hasOrder_1
                        ? // @ts-ignore: for some reason the same use of conditional check works above for order[0] (firstLevel1Node) but not for l+1 here
                            nodes[order_1[l_1 + 1]]
                        : // @ts-ignore: for some reason the same use of conditional check works above for order[0] (firstLevel1Node) but not for l+1 here
                            nodes[dimensions[order_1[l_1 + 1]].nodeId]
                    : order_1[l_1 + 1];
                createEdge(level1Node.id, nextLevel1Node.id, siblingRules_1);
            }
            if (!l_1 && extents_1 === 'bridgedCustom') {
                // if we started the dimension and bridge is set, we need to create backwards bridge to new element
                createEdge(po_1.level1Options.behavior.customBridgePost, level1Node.id, siblingRules_1);
            }
            l_1++;
        });
        // now that level1 (dimensions plus optional stuff) and the root are taken care of, we handle divisions + children
        dimensionKeys.forEach(function (s) {
            var _a;
            var dimension = dimensions[s];
            var extents = ((_a = dimension.behavior) === null || _a === void 0 ? void 0 : _a.extents) || 'circular'; // we default to circular
            if (!dimension.divisions) {
                console.error("Parsing dimensions. The dimension using the key ".concat(s, " is missing the divisions property. dimension.divisions should be supplied. ").concat(JSON.stringify(dimension), "."));
            }
            /*
                In the below loop, we are creating an edge between the current element and the next element
                in the dimension. We only ever add links forward, since (like a linked list), the edges go
                both ways. However, we DO need to check for a backwards bridge at the start, which could
                end up creating some kind of double-edge situation. This needs more testing to figure out
                the correct approach moving forward.
            */
            var divisionKeys = Object.keys(dimension.divisions);
            var j = 0;
            divisionKeys.forEach(function (d) {
                var division = dimension.divisions[d];
                // we need to connect divisions and make them navigable!
                if (j === divisionKeys.length - 1 &&
                    (extents === 'circular' || extents === 'bridgedCousins' || extents === 'bridgedCustom')) {
                    // we are at the end, create forwards loop to start of list
                    createEdge(division.id, dimension.divisions[divisionKeys[0]].id, dimension.navigationRules.sibling_sibling);
                }
                else if (j < divisionKeys.length - 1) {
                    // we are in the division but not at the end, create forwards step
                    createEdge(division.id, dimension.divisions[divisionKeys[j + 1]].id, dimension.navigationRules.sibling_sibling);
                }
                var valueKeys = Object.keys(division.values);
                // every division needs to go up to parent and down to first child
                createEdge(division.id, dimension.nodeId, dimension.navigationRules.parent_child);
                var firstChildId = typeof options.idKey === 'function' ? options.idKey(division.values[valueKeys[0]]) : options.idKey;
                createEdge(division.id, division.values[valueKeys[0]][firstChildId], dimension.navigationRules.parent_child);
                // lastly, we prep the childmost level
                var i = 0;
                if (valueKeys.length > 1) {
                    valueKeys.forEach(function (vk) {
                        var v = division.values[vk];
                        var id = typeof options.idKey === 'function' ? options.idKey(v) : options.idKey;
                        // every child needs to be able to go up to their parent
                        createEdge(v[id], division.id, dimension.navigationRules.parent_child);
                        if (i === valueKeys.length - 1 && extents === 'circular') {
                            // we are at the end, create forwards loop to start of list
                            var targetId = typeof options.idKey === 'function'
                                ? options.idKey(division.values[valueKeys[0]])
                                : options.idKey;
                            createEdge(v[id], division.values[valueKeys[0]][targetId], dimension.navigationRules.sibling_sibling);
                        }
                        else if (i === valueKeys.length - 1 && extents === 'bridgedCousins') {
                            if (j !== divisionKeys.length - 1) {
                                // we are at the end of values but not divisions, create forwards bridge to the first child of the next division
                                var targetId = typeof options.idKey === 'function'
                                    ? options.idKey(dimension.divisions[divisionKeys[j + 1]].values[valueKeys[0]])
                                    : options.idKey;
                                createEdge(v[id], dimension.divisions[divisionKeys[j + 1]].values[valueKeys[0]][targetId], dimension.navigationRules.sibling_sibling);
                            }
                            else {
                                // we are at the end of values and divisions, create forwards bridge to the first child of the first division
                                var targetId = typeof options.idKey === 'function'
                                    ? options.idKey(dimension.divisions[divisionKeys[0]].values[valueKeys[0]])
                                    : options.idKey;
                                createEdge(v[id], dimension.divisions[divisionKeys[0]].values[valueKeys[0]][targetId], dimension.navigationRules.sibling_sibling);
                            }
                        }
                        else if (i === valueKeys.length - 1 && extents === 'bridgedCustom') {
                            // we are at the end, create forwards bridge to new element
                            createEdge(v[id], dimension.behavior.customBridgePost, dimension.navigationRules.sibling_sibling);
                        }
                        else if (i < valueKeys.length - 1) {
                            // we are in the dimension but not at the end, create forwards step
                            var targetId = typeof options.idKey === 'function'
                                ? options.idKey(division.values[valueKeys[i + 1]])
                                : options.idKey;
                            createEdge(v[id], division.values[valueKeys[i + 1]][targetId], dimension.navigationRules.sibling_sibling);
                        }
                        if (!i && extents === 'bridgedCousins') {
                            if (j !== 0) {
                                // we are at the start of values (but not divisions) and bridge is set, we need to create backwards bridge to the previous division's last child
                                var targetId = typeof options.idKey === 'function'
                                    ? options.idKey(dimension.divisions[divisionKeys[j - 1]].values[valueKeys[valueKeys.length - 1]])
                                    : options.idKey;
                                createEdge(dimension.divisions[divisionKeys[j - 1]].values[valueKeys[valueKeys.length - 1]][targetId], v[id], dimension.navigationRules.sibling_sibling);
                            }
                            else {
                                // we are at the start of values and divivions and bridge is set, we need to create backwards bridge to the last division's last child
                                var targetId = typeof options.idKey === 'function'
                                    ? options.idKey(dimension.divisions[divisionKeys[divisionKeys.length - 1]].values[valueKeys[valueKeys.length - 1]])
                                    : options.idKey;
                                createEdge(dimension.divisions[divisionKeys[divisionKeys.length - 1]].values[valueKeys[valueKeys.length - 1]][targetId], v[id], dimension.navigationRules.sibling_sibling);
                            }
                        }
                        else if (!i && extents === 'bridgedCustom') {
                            // if we started the dimension and bridge is set, we need to create backwards bridge to new element
                            createEdge(dimension.behavior.customBridgePrevious, v[id], dimension.navigationRules.sibling_sibling);
                        }
                        i++;
                    });
                }
                j++;
            });
            // }
        });
    }
    Object.keys(nodes).forEach(function (nodeKey) {
        var _a;
        var node = nodes[nodeKey];
        if ((_a = options.genericEdges) === null || _a === void 0 ? void 0 : _a.length) {
            options.genericEdges.forEach(function (e) {
                if (!edges[e.edgeId]) {
                    edges[e.edgeId] = e.edge;
                }
                if (!e.conditional || (e.conditional && e.conditional(node, e))) {
                    node.edges.push(e.edgeId);
                }
            });
        }
    });
    return edges;
};
exports.buildEdges = buildEdges;
var buildRules = function (options) {
    console.log('buildRules() still needs to be sorted out! we are making rules when we buildEdges');
    return options.navigationRules || consts_1.GenericFullNavigationRules;
};
exports.buildRules = buildRules;
var buildStructure = function (options) {
    if (options.addIds) {
        (0, exports.addSimpleDataIDs)(options);
    }
    var nodes = (0, exports.bulidNodes)(options);
    // console.log("nodes",nodes)
    var dimensions = (0, exports.scaffoldDimensions)(options, nodes);
    // console.log("dimensions",dimensions)
    var edges = (0, exports.buildEdges)(options, nodes, dimensions);
    // console.log("edges",edges)
    var navigationRules = (0, exports.buildRules)(options);
    return {
        nodes: nodes,
        edges: edges,
        dimensions: dimensions,
        navigationRules: navigationRules
    };
};
exports.buildStructure = buildStructure;


/***/ }),

/***/ 5:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.describeNode = void 0;
var describeNode = function (d, descriptionOptions) {
    var keys = Object.keys(d);
    var description = '';
    keys.forEach(function (key) {
        description += "".concat(descriptionOptions && descriptionOptions.omitKeyNames ? '' : key + ': ').concat(d[key], ". ");
    });
    description += (descriptionOptions && descriptionOptions.semanticLabel) || 'Data point.';
    return description;
};
exports.describeNode = describeNode;


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
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {

// EXTERNAL MODULE: ./src/index.ts
var src = __webpack_require__(607);
;// CONCATENATED MODULE: ./examples/force-graph.js
// Copyright 2021-2024 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
/*
    @frankelavsky's NOTE: This works beautifully out of the box for my purposes, but I did make a few changes
    Record of changes:
        - Added a limit to the simulation so that nodes don't fly out of view if without links
*/
function ForceGraph(
    {
        nodes, // an iterable of node objects (typically [{id}, …])
        links // an iterable of link objects (typically [{source, target}, …])
    },
    {
        nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
        nodeGroup, // given d in nodes, returns an (ordinal) value for color
        nodeGroups, // an array of ordinal values representing the node groups
        nodeTitle, // given d in nodes, a title string
        nodeFill = 'currentColor', // node stroke fill (if not using a group color encoding)
        nodeStroke = '#fff', // node stroke color
        nodeStrokeWidth = 1.5, // node stroke width, in pixels
        nodeStrokeOpacity = 1, // node stroke opacity
        nodeRadius = 5, // node radius, in pixels
        nodeStrength,
        linkSource = ({ source }) => source, // given d in links, returns a node identifier string
        linkTarget = ({ target }) => target, // given d in links, returns a node identifier string
        linkStroke = '#999', // link stroke color
        linkStrokeOpacity = 0.6, // link stroke opacity
        linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
        linkStrokeLinecap = 'round', // link stroke linecap
        linkStrength,
        colors = d3.schemeTableau10, // an array of color strings, for the node groups
        width = 640, // outer width, in pixels
        height = 400, // outer height, in pixels
        invalidation // when this promise resolves, stop the simulation
    } = {}
) {
    // Compute values.
    const N = d3.map(nodes, nodeId).map(intern);
    const R = typeof nodeRadius !== 'function' ? null : d3.map(nodes, nodeRadius);
    const LS = d3.map(links, linkSource).map(intern);
    const LT = d3.map(links, linkTarget).map(intern);
    if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
    const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
    const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
    const W = typeof linkStrokeWidth !== 'function' ? null : d3.map(links, linkStrokeWidth);
    const L = typeof linkStroke !== 'function' ? null : d3.map(links, linkStroke);

    // Replace the input nodes and links with mutable objects for the simulation.
    nodes = d3.map(nodes, (_, i) => ({ id: N[i] }));
    links = d3.map(links, (_, i) => ({ source: LS[i], target: LT[i] }));

    // Compute default domains.
    if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

    // Construct the scales.
    const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

    // Construct the forces.
    const forceNode = d3.forceManyBody();
    const forceLink = d3.forceLink(links).id(({ index: i }) => N[i]);
    if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
    if (linkStrength !== undefined) forceLink.strength(linkStrength);

    const simulation = d3
        .forceSimulation(nodes)
        .force('link', forceLink)
        .force('charge', forceNode)
        .force('center', d3.forceCenter())
        .on('tick', ticked);

    const svg = d3
        .create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [-width / 2, -height / 2, width, height])
        .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    const link = svg
        .append('g')
        .attr('stroke', typeof linkStroke !== 'function' ? linkStroke : null)
        .attr('stroke-opacity', linkStrokeOpacity)
        .attr('stroke-width', typeof linkStrokeWidth !== 'function' ? linkStrokeWidth : null)
        .attr('stroke-linecap', linkStrokeLinecap)
        .selectAll('line')
        .data(links)
        .join('line');

    const node = svg
        .append('g')
        .attr('fill', nodeFill)
        .attr('stroke', nodeStroke)
        .attr('stroke-opacity', nodeStrokeOpacity)
        .attr('stroke-width', nodeStrokeWidth)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', nodeRadius)
        .call(drag(simulation));

    if (W) link.attr('stroke-width', ({ index: i }) => W[i]);
    if (L) link.attr('stroke', ({ index: i }) => L[i]);
    if (G) node.attr('fill', ({ index: i }) => color(G[i]));
    if (R) node.attr('r', ({ index: i }) => R[i]);
    if (T) node.append('title').text(({ index: i }) => T[i]);
    if (invalidation != null) invalidation.then(() => simulation.stop());

    function intern(value) {
        return value !== null && typeof value === 'object' ? value.valueOf() : value;
    }

    function ticked() {
        link.attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node.attr('cx', d => {
            // if nodes lack links, they will fly off screen
            // this keeps nodes within the svg
            let limit = width/2 - nodeRadius
            if (d.x > limit || d.x < -limit) {
                return limit
            }
            return d.x
        }).attr('cy', d => {
            // if nodes lack links, they will fly off screen
            // this keeps nodes within the svg
            let limit = height/2 - nodeRadius
            if (d.y > limit || d.y < -limit) {
                return limit
            }
            return d.y
        });
    }

    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
    }

    return Object.assign(svg.node(), { scales: { color } });
}

// EXTERNAL MODULE: ./src/utilities.ts
var utilities = __webpack_require__(5);
;// CONCATENATED MODULE: ./examples/testing-environment.js




let exit = {}

const convertToArray = (o, include, exclude) => {
    let x = [];
    if (include) {
        include.forEach(i => {
            let n = {id: i}
            x.push(n)
        })
    }
    Object.keys(o).forEach(k => {
        if (exclude) {
            let excluding = false
            exclude.forEach(e => {
                if (k === e) {
                    excluding = true
                }
            })
            if (excluding) {
                return
            }
        }
        x.push(o[k]);
    });
    return x;
};

const addRenderingProperties = (nodes, root, size) => {
    Object.keys(nodes).forEach(k => {
        let node = nodes[k]
        if (!node.renderId) {
            node.renderId = node.id
        }
        let label = ""
        node.existingElement = {
            useForSpatialProperties: true,
            spatialProperties: () => {
                let box = document.getElementById(root).querySelector("#svg"+node.renderId).getBBox()
                return {
                    x: box.x + size/2 - 1.82,
                    y: box.y + size/2 - 1.82,
                    width: box.width,
                    height: box.height
                }
            }
        }
        if (!node.derivedNode) {
            label = (0,utilities.describeNode)(node.data,{})
        } else {
            if (node.data.dimensionKey) {
                // dimension
                let count = 0
                let divisions = Object.keys(node.data.divisions)
                if (divisions.length) {
                    divisions.forEach(div => {
                        count += Object.keys(node.data.divisions[div].values).length
                    })
                }
                label = `${node.derivedNode}.`
                label += divisions.length && count ? ` Contains ${divisions.length} division${divisions.length > 1 ? "s" : ""} which contain ${count} datapoint${count > 1 ? "s" : ""} total.` : " Contains no child data points."
                label += ` ${node.data.type} dimension.`
            } else {
                // division
                label = `${node.derivedNode}: ${node.data[node.derivedNode]}. Contains ${Object.keys(node.data.values).length} child data point${Object.keys(node.data.values).length > 1 ? "s" : ""}. Division of ${node.derivedNode} dimension.`
            }
        }
        node.semantics = {
            label
        }
    })
}

const createRenderer = (structure, id, enter) => {
    return src/* default */.Z.rendering({
        elementData: structure.nodes,
        defaults: {
            cssClass: 'dn-test-class'
        },
        suffixId: 'data-navigator-schema-'+id,
        root: {
            id: "dn-root-"+id,
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
}

const hideTooltip = id => {
    document.getElementById(id).classList.add('hidden');
};

const showTooltip = (d, id, size, coloredBy) => {
    const tooltip = document.getElementById(id);
    tooltip.classList.remove('hidden');
    tooltip.innerText = d.semantics?.label || `${d.id}${d.data?.[coloredBy] ? ', ' + d.data[coloredBy] : ''}`;
    const bbox = tooltip.getBoundingClientRect();
    // const offset = bbox.width / 2;
    const yOffset = bbox.height / 2;
    tooltip.style.textAlign = 'left';
    tooltip.style.transform = `translate(${size}px,${size/2 - yOffset}px)`;
};

const buildGraph = (structure, rootId, size, colorBy, entryPoint) => {
    let entered;
    let previous;
    let current;

    addRenderingProperties(structure.nodes, rootId, size)
    
    let graph = ForceGraph(
        {
            nodes: convertToArray(structure.nodes, ["exit"]),
            links: convertToArray(structure.edges, [], ['any-exit'])
        },
        {
            nodeId: d => d.id,
            nodeGroup: d => d.data?.[colorBy],
            width: size,
            height: size
        }
    );
    document.getElementById(rootId).appendChild(graph);
    document
        .getElementById(rootId)
        .querySelectorAll('circle')
        .forEach(c => {
            c.id = "svg" + c.__data__?.id;
            c.addEventListener('mousemove', e => {
                if (e.target?.__data__?.id) {
                    let d = e.target.__data__;
                    showTooltip(structure.nodes[d.id], `${rootId}-tooltip`, size, colorBy);
                }
            });
            c.addEventListener('mouseleave', () => {
                hideTooltip(`${rootId}-tooltip`);
            });
        });
    document
        .getElementById("dn-root-"+rootId)
        .addEventListener("blur", ()=> { hideTooltip(`${rootId}-tooltip`) })

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
        entered = false;
        rendering.exitElement.style.display = 'block';
        input.focus(rendering.exitElement.id);
        previous = current;
        current = null;
        rendering.remove(previous);
        hideTooltip(`${rootId}-tooltip`);
    };

    const rendering = createRenderer(structure, rootId, enter)
    rendering.initialize();
    console.log("structure.navigationRules",structure.navigationRules)
    const input = src/* default */.Z.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint,
        exitPoint: rendering.exitElement.id
    });

    const initiateLifecycle = nextNode => {
        const node = rendering.render({
            renderId: nextNode.renderId,
            datum: nextNode
        });
        node.addEventListener('keydown', e => {
            console.log("keydown",e)
            const direction = input.keydownValidator(e);
            if (direction) {
                e.preventDefault();
                move(direction);
            }
        });
        showTooltip(nextNode, `${rootId}-tooltip`, size, colorBy);
        console.log("nextNode.renderId",nextNode.renderId)
        input.focus(nextNode.renderId);
        entered = true;
        previous = current;
        current = nextNode.id;
        rendering.remove(previous);
    };
};

const simpleDataTest = [
    {
        id: 'a',
        cat: 'meow',
        num: 3
    },
    {
        id: 'b',
        cat: 'meow',
        num: 1
    },
    {
        id: 'c',
        cat: 'meow',
        num: 2
    },
    {
        id: 'd',
        cat: 'bork',
        num: 4
    }
];
console.log('simpleDataTest', simpleDataTest);
let simpleStructure = src/* default */.Z.structure({
    data: simpleDataTest,
    idKey: 'id',
    dimensions: {
        values: [
            {
                dimensionKey: 'cat',
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                }
            },
            {
                dimensionKey: 'num',
                type: 'numerical',
                behavior: {
                    extents: 'terminal'
                }
            }
        ]
    },
    genericEdges: [
        {
            edgeId: "any-exit",
            edge: {
                source: (_d, c) => c,
                target: () => {
                    exit["simple"]();
                    return '';
                },
                navigationRules: ['exit']
            }
        }
    ]
});
console.log('simpleStructure', simpleStructure);
buildGraph(simpleStructure, 'simple', 300, 'cat', simpleStructure.dimensions[Object.keys(simpleStructure.dimensions)[0]].nodeId);

let addDataTest = [...simpleDataTest];
addDataTest.push({
    id: 'e',
    cat: 'bork',
    num: 12
});
console.log('addDataTest', addDataTest);
let addedDataStructure = src/* default */.Z.structure({
    data: addDataTest,
    addIds: true,
    idKey: 'addedId',
    dimensions: {
        values: [
            {
                dimensionKey: 'cat',
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                }
            },
            {
                dimensionKey: 'num',
                type: 'numerical',
                behavior: {
                    extents: 'terminal'
                }
            }
        ]
    },
    genericEdges: [
        {
            edgeId: "any-exit",
            edge: {
                source: (_d, c) => c,
                target: () => {
                    exit["added"]();
                    return '';
                },
                navigationRules: ['exit']
            }
        }
    ]
});
console.log('addedDataStructure', addedDataStructure);
buildGraph(addedDataStructure, 'added', 300, 'cat', addedDataStructure.dimensions[Object.keys(addedDataStructure.dimensions)[0]].nodeId);

const largerData = [
    {
        date: '2016-01-01',
        category: 'Group A',
        value: 120,
        count: 420
    },
    {
        date: '2016-02-01',
        category: 'Group A',
        value: 121,
        count: 439
    },
    {
        date: '2016-03-01',
        category: 'Group A',
        value: 119,
        count: 402
    },
    {
        date: '2016-04-01',
        category: 'Group A',
        value: 114,
        count: 434
    },
    {
        date: '2016-05-01',
        category: 'Group A',
        value: 102,
        count: 395
    },
    {
        date: '2016-06-01',
        category: 'Group A',
        value: 112,
        count: 393
    },
    {
        date: '2016-07-01',
        category: 'Group A',
        value: 130,
        count: 445
    },
    {
        date: '2016-08-01',
        category: 'Group A',
        value: 124,
        count: 456
    },
    {
        date: '2016-09-01',
        category: 'Group A',
        value: 119,
        count: 355
    },
    {
        date: '2016-10-01',
        category: 'Group A',
        value: 106,
        count: 464
    },
    {
        date: '2016-11-01',
        category: 'Group A',
        value: 123,
        count: 486
    },
    {
        date: '2016-12-01',
        category: 'Group A',
        value: 133,
        count: 491
    },
    {
        date: '2016-01-01',
        category: 'Group B',
        value: 89,
        count: 342
    },
    {
        date: '2016-02-01',
        category: 'Group B',
        value: 93,
        count: 434
    },
    {
        date: '2016-03-01',
        category: 'Group B',
        value: 82,
        count: 378
    },
    {
        date: '2016-04-01',
        category: 'Group B',
        value: 92,
        count: 323
    },
    {
        date: '2016-05-01',
        category: 'Group B',
        value: 90,
        count: 434
    },
    {
        date: '2016-06-01',
        category: 'Group B',
        value: 85,
        count: 376
    },
    {
        date: '2016-07-01',
        category: 'Group B',
        value: 88,
        count: 404
    },
    {
        date: '2016-08-01',
        category: 'Group B',
        value: 84,
        count: 355
    },
    {
        date: '2016-09-01',
        category: 'Group B',
        value: 90,
        count: 432
    },
    {
        date: '2016-10-01',
        category: 'Group B',
        value: 80,
        count: 455
    },
    {
        date: '2016-11-01',
        category: 'Group B',
        value: 92,
        count: 445
    },
    {
        date: '2016-12-01',
        category: 'Group B',
        value: 97,
        count: 321
    },
    {
        date: '2016-01-01',
        category: 'Group C',
        value: 73,
        count: 456
    },
    {
        date: '2016-02-01',
        category: 'Group C',
        value: 74,
        count: 372
    },
    {
        date: '2016-03-01',
        category: 'Group C',
        value: 68,
        count: 323
    },
    {
        date: '2016-04-01',
        category: 'Group C',
        value: 66,
        count: 383
    },
    {
        date: '2016-05-01',
        category: 'Group C',
        value: 72,
        count: 382
    },
    {
        date: '2016-06-01',
        category: 'Group C',
        value: 70,
        count: 365
    },
    {
        date: '2016-07-01',
        category: 'Group C',
        value: 74,
        count: 296
    },
    {
        date: '2016-08-01',
        category: 'Group C',
        value: 68,
        count: 312
    },
    {
        date: '2016-09-01',
        category: 'Group C',
        value: 75,
        count: 334
    },
    {
        date: '2016-10-01',
        category: 'Group C',
        value: 66,
        count: 386
    },
    {
        date: '2016-11-01',
        category: 'Group C',
        value: 85,
        count: 487
    },
    {
        date: '2016-12-01',
        category: 'Group C',
        value: 89,
        count: 512
    },
    {
        date: '2016-01-01',
        category: 'Other',
        value: 83,
        count: 432
    },
    {
        date: '2016-02-01',
        category: 'Other',
        value: 87,
        count: 364
    },
    {
        date: '2016-03-01',
        category: 'Other',
        value: 76,
        count: 334
    },
    {
        date: '2016-04-01',
        category: 'Other',
        value: 86,
        count: 395
    },
    {
        date: '2016-05-01',
        category: 'Other',
        value: 87,
        count: 354
    },
    {
        date: '2016-06-01',
        category: 'Other',
        value: 77,
        count: 386
    },
    {
        date: '2016-07-01',
        category: 'Other',
        value: 79,
        count: 353
    },
    {
        date: '2016-08-01',
        category: 'Other',
        value: 85,
        count: 288
    },
    {
        date: '2016-09-01',
        category: 'Other',
        value: 87,
        count: 353
    },
    {
        date: '2016-10-01',
        category: 'Other',
        value: 76,
        count: 322
    },
    {
        date: '2016-11-01',
        category: 'Other',
        value: 96,
        count: 412
    },
    {
        date: '2016-12-01',
        category: 'Other',
        value: 104,
        count: 495
    }
];

let largerStructure = src/* default */.Z.structure({
    data: largerData,
    idKey: 'id',
    addIds: true,
    dimensions: {
        values: [
            {
                dimensionKey: 'date',
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                operations: {
                    sortFunction: (a, b, c) => {
                        if (a.values) {
                            let aDate = new Date(a.values[Object.keys(a.values)[0]].date);
                            let bDate = new Date(b.values[Object.keys(b.values)[0]].date);
                            return aDate - bDate;
                        } else {
                            return;
                        }
                    }
                }
            },
            {
                dimensionKey: 'category',
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                }
            },
            // {
            //     dimensionKey: 'value',
            //     type: 'numerical',
            //     behavior: {
            //         extents: 'terminal'
            //     }
            // },
            // {
            //     dimensionKey: 'count',
            //     type: 'numerical',
            //     behavior: {
            //         extents: 'terminal'
            //     }
            // }
        ]
    },
    genericEdges: [
        {
            edgeId: "any-exit",
            edge: {
                source: (_d, c) => c,
                target: () => {
                    exit["larger"]();
                    return '';
                },
                navigationRules: ['exit']
            }
        }
    ]
});
console.log('largerStructure', largerStructure);
buildGraph(largerStructure, 'larger', 300, 'category', largerStructure.dimensions[Object.keys(largerStructure.dimensions)[0]].nodeId);

/*
        checklist for edge creation: (we start low and work up)
        within divisions:
            self-siblingForward (each)
            self-parentDivision (each)
            parentDivision-firstChild (1x)
        across divisions:
            divisionSelf-divisionForward (each)
            divisionSelf-dimension (each)
            parentDimension-firstDivision (1x)
        across dimensions (check if level1Order):
            dimensionSelf-forward (each)
            dimensionSelf-level0Node (each, if level0 set)
            level0Node-firstDimension (1x, if level0 set)
        final stage (if generic edges):
            item-genericEdge

        DimensionOptions = {
            values: DimensionList;
            parentOptions: {
                level1Options?: {
                    order: AddOrReferenceNodeList;
                    behavior?: DimensionBehavior;
                    navigationRules?: DimensionNavigationRules;
                };
                addLevel0?: NodeObject;
            };
            adjustDimensions?: AdjustingFunction;
        }
            ["previous_" + dim.dimensionKey, "next_" + dim.dimensionKey],
            ["parent_" + dim.dimensionKey, "child"]
    */

// const dataTest = [
//     {
//         state: "California",
//         region: "West",
//         leaning: "Liberal",
//         rank: 1,
//         quality: 10,
//         resilience: 5,
//         pop: 39
//     },
//     {
//         state: "Washington",
//         region: "West",
//         leaning: "Liberal",
//         rank: 2,
//         quality: 10,
//         resilience: 9,
//         pop: 8
//     },
//     {
//         state: "Oregon",
//         region: "West",
//         leaning: "Liberal",
//         rank: 15,
//         quality: 7,
//         resilience: 9,
//         pop: 4
//     },
//     {
//         state: "Illinois",
//         region: "Central",
//         leaning: "Liberal",
//         rank: 10,
//         quality: 7,
//         resilience: 5,
//         pop: 13
//     },
//     {
//         state: "Michigan",
//         region: "Central",
//         leaning: "Conservative",
//         rank: 21,
//         quality: 5,
//         resilience: 5,
//         pop: 10
//     },
//     {
//         state: "Massachusetts",
//         region: "East",
//         leaning: "Liberal",
//         rank: 3,
//         quality: 10,
//         resilience: 7,
//         pop: 7
//     },
//     {
//         state: "New York",
//         region: "East",
//         leaning: "Liberal",
//         rank: 9,
//         quality: 8,
//         resilience: 6,
//         pop: 20
//     },
//     {
//         state: "Pennsylvania",
//         region: "East",
//         leaning: "Conservative",
//         rank: 13,
//         quality: 7,
//         resilience: 5,
//         pop: 13
//     },
//     {
//         state: "Georgia",
//         region: "East",
//         leaning: "Conservative",
//         rank: 20,
//         quality: 4,
//         resilience: 4,
//         pop: 11
//     },
//     {
//         state: "Colorado",
//         region: "Mountain",
//         leaning: "Liberal",
//         rank: 4,
//         quality: 8,
//         resilience: 10,
//         pop: 6
//     },
//     {
//         state: "Wyoming",
//         region: "Mountain",
//         leaning: "Conservative",
//         rank: 50,
//         quality: 1,
//         resilience: 5,
//         pop: 1
//     },
//     {
//         state: "Idaho",
//         region: "Mountain",
//         leaning: "Conservative",
//         rank: 40,
//         quality: 1,
//         resilience: 6,
//         pop: 2
//     },
// ]

// data: GenericDataset;
// idKey: DynamicNodeIdKey;
// keys: KeyList;
// renderIdKey?: DynamicRenderIdKey;
// dimensions?: DimensionOptions;
// genericEdges?: EdgeOptions;
// dataType?: DataType;
// addIds?: boolean;
// navigationRules?: NavigationRules;

// dimensionKey: DimensionKey;
// nestedSettings?: NestedSettings;
// type?: DimensionType;
// behavior?: DimensionBehavior;
// navigationRules?: NavigationList;
// sortingFunction?: SortingFunction;

let parentIdGenerator = (d, s) => {
    return d[s.dimensionKey];
};
let ascendingSort = (a, b, c) => a[c.dimensionKey] - b[c.dimensionKey];
let descendingSort = (a, b, c) => b[c.dimensionKey] - a[c.dimensionKey];

/*
let structureTestWithStateIds = buildStructure({
    data: dataTest,
    idKey: "state",
    dimensions:{ 
        values: [
            {
                dimensionKey: "region",
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "leaning",
                // type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "rank",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: ascendingSort
            },
            {
                dimensionKey: "quality",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "resilience",
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "pop",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            }
    ]}
})
console.log(structureTestWithStateIds)

let structureTestWithShortIds = buildStructure({
    data: dataTest,
    idKey: "id",
    dimensions: { 
        values: [
            {
                dimensionKey: "region",
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "leaning",
                // type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "rank",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: ascendingSort
            },
            {
                dimensionKey: "quality",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "resilience",
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "pop",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            }
        ]
    },
    addIds: true
})
console.log(structureTestWithLongIds)

let structureTestWithLongIds = buildStructure({
    data: dataTest,
    idKey: "id",
    dimensions: {
        values: [
            {
                dimensionKey: "region",
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "leaning",
                // type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "rank",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: ascendingSort
            },
            {
                dimensionKey: "quality",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "resilience",
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "pop",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            }
        ],
    },
    addIds: true,
    keysForIdGeneration: [
        "state", // unique! but we don't do anything with this
        "region", // categorical
        "leaning", // categorical but no type sent
        "rank", // low to high, numerical
        "quality", // high to low, numerical
        "resilience", // high to low, numerical but no type sent
        "pop" // low to high, numerical, no sortingFunc sent
    ],
})
console.log(structureTestWithLongIds)
*/

})();

/******/ })()
;