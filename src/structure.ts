import { GenericLimitedNavigationRules, GenericFullNavigationRules, GenericFullNavigationDimensions } from './consts';
import { StructureOptions, EdgeList } from './data-navigator';
import { describeNode } from './utilities';

export default (options: StructureOptions) => {
    if (options.dataType === 'vega-lite' || options.dataType === 'vl' || options.dataType === 'Vega-Lite') {
        return buildNodeStructureFromVegaLite(options);
    } else {
        console.warn(
            'Apologies, we currently only have structure scaffolding for Vega-Lite, generic scaffolding coming soon!'
        );
        return;
    }
};

export const buildNodeStructureFromVegaLite = options => {
    let navigationRules = GenericLimitedNavigationRules;
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
        const edgeList = [] as EdgeList;
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

        elementData[renderId] = {};
        elementData[renderId].renderId = renderId;
        elementData[renderId].dimensions = {};
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
        elementData[renderId].semantics = {};
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

/*
    this function creates an index for every datum in options.data,
    adds that index to the datum (mutating the datum directly),
    optionally can count the number of times a datum's keys have
    already been seen in other datum, and will also (if a string),
    count the number of times the value of that key has been seen
*/
export const addSimpleDataIDs = options => {
    let i = 0;
    let keyCounter = {};
    options.data.forEach(d => {
        const id = options.idKey || 'id';
        d[id] = i + '';
        if (options.keys) {
            options.keys.forEach(k => {
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
                    } else {
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

// need lifecycle stuff for this (add/remove/etc) - this will be hard to do well!
/*
    This function creates a node for every relation type as well as a node 
*/
export const bulidNodes = options => {
    let nodes = {};
    // this will eventually be our generic method for dn.structure()

    // convert all data to a graph structure!
    options.data.forEach(d => {
        if (!options.keys.id) {
            console.error(
                `Building nodes. A key string must be supplied in options.keys.id to specify the id keys of every node.`
            );
        }

        const idKey = typeof options.keys.id === 'function' ? options.keys.id(d) : options.keys.id;
        const id = d[idKey];

        if (!id) {
            console.error(
                `Building nodes. Each datum in options.data must contain an id. When matching the id key string ${idKey}, this datum has no id: ${JSON.stringify(
                    d
                )}.`
            );
            return;
        }

        if (!nodes[id]) {
            const renderIdKey =
                typeof options.keys.renderId === 'function' ? options.keys.renderId(d) : options.keys.renderId;
            nodes[id] = {
                id: id,
                edges: [],
                renderId: renderIdKey ? d[renderIdKey] || '' : d.renderIdKey || '',
                data: d
            };
        } else {
            console.error(
                `Building nodes. Each id for data in options.data must be unique. This id is not unique: ${id}.`
            );
            return;
        }
    });

    return nodes;
};

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
*/
export const scaffoldDimensions = (options, nodes) => {
    let dimensions = {};
    options.data.forEach(d => {
        const idKey = typeof options.keys.id === 'function' ? options.keys.id(d) : options.keys.id;
        const id = d[idKey];

        let ods = options.dimensions || [];
        ods.forEach(s => {
            if (!s.key) {
                console.error(
                    `Building nodes, parsing dimensions. Each dimension in options.dimensions must contain a key. This dimension has no key: ${JSON.stringify(
                        s
                    )}.`
                );
                return;
            }
            if (s.key in d) {
                let v = d[s.key];
                let id = '';
                if (s?.nestedSettings?.derivedParent) {
                    // build parent node
                    if (!s.nestedSettings.parentNode) {
                        console.error(
                            `Building nodes, parsing dimensions. The dimension using the key ${
                                s.key
                            } is nested, but dimension.parentNode property object is missing. parentNode.derived and parentNode.id should be supplied. ${JSON.stringify(
                                s
                            )}.`
                        );
                    }
                    /*
                        "parentNode": {
                            "id": (d, s) : string =>{} | string | undefined, // if derived is false, id is required, if derived is true and id is empty or undefined, then id will be generated
                            "rendering": {
                                "renderId": "",
                                "strategy": "outlineEach" | "convexHull" | "singleSquare"
                            } 
                        } | undefined // if nestedSettings.nested is true, then parentNode is required
                    */
                    let p = s.nestedSettings.parentNode;
                    id = typeof p.id === 'function' ? p.id(d, s) : p.id;
                    nodes[id] = {
                        id: id,
                        edges: [],
                        derivedNode: true,
                        renderId: p?.rendering?.renderId,
                        renderingStrategy: p?.rendering?.strategy,
                        data: s
                    };
                }
                if (!dimensions[s.key]) {
                    let rules = [...GenericFullNavigationDimensions];
                    const createRules = () => {
                        if (s.navigationRules) {
                            rules = []; // we don't want to use any default rules if navrules was set for any dimension
                            return s.navigationRules;
                        }
                        let rule = rules.shift();
                        return rule || [];
                    };
                    dimensions[s.key] = {
                        values: [],
                        dimensionKey: s.key,
                        type: s.type ? s.type : typeof v === 'number' && !isNaN(v) ? 'numerical' : 'categorical',
                        sortingFunction: s.sortingFunction,
                        behavior: s.behavior || { extents: 'circular' },
                        navigationRules: createRules()
                    };
                    if (id) {
                        dimensions[s.key].id = id;
                    }
                }
                dimensions[s.key].values.push(nodes[id]);
            }
        });
    });

    Object.keys(dimensions).forEach(s => {
        let dimension = dimensions[s];
        let dimensionValues = dimension.values;
        if (dimension.sortingFunction) {
            dimensionValues.sort((a, b) => {
                return dimension.sortingFunction(a, b, dimension);
            });
        } else if (dimension.type === 'numerical') {
            dimensionValues.sort((a, b) => {
                return a[dimension.dimensionKey] - b[dimension.dimensionKey];
            });
        }
    });

    return dimensions;
};

export const buildEdges = (options, nodes, dimensions?) => {
    /*
        export type EdgeObject = {
            source: (() => NodeId) | NodeId;
            target: (() => NodeId) | NodeId;
            navigationRules: NavigationList;
        }
        dimensions = {
            key: {
                values,
                dimensionKey,
                type,
                sortingFunction,
                behavior
            }
        }
        node = {
            id: id,
            edges: [],
            renderId: renderIdKey ? (d[renderIdKey] || "") : d.renderIdKey || "",
            data: d,
            derivedNode?: true
        }
    */
    let edges = {};

    const createEdge = (source, target, rules?) => {
        const id = `${source}-${target}`;
        // create edge object
        edges[id] = {
            source,
            target,
            navigationRules: rules || []
        };
        // add edgeId to source and target's edges
        nodes[source].edges.push(id);
        nodes[target].edges.push(id);
    };

    const dimensionKeys = dimensions ? Object.keys(dimensions) : [];
    dimensionKeys.forEach(s => {
        const dimension = dimensions[s];
        let extents = dimension.behavior?.extents || 'circular'; // we default to circular
        if (!dimension.values) {
            console.error(
                `Parsing dimensions. The dimension using the key ${s} is missing the values property. dimension.values should be supplied. ${JSON.stringify(
                    dimension
                )}.`
            );
        }
        let i = 0;
        /*
            In the below loop, we are creating an edge between the current element and the next element
            in the dimension. We only ever add links forward, since (like a linked list), the edges go
            both ways. However, we DO need to check for a backwards bridge at the start, which could
            end up creating some kind of double-edge situation. This needs more testing to figure out
            the correct approach moving forward.
        */
        dimension.values.forEach(v => {
            if (i === dimension.values.length - 1 && extents === 'circular') {
                // we are at the end, create forwards loop to start of list
                createEdge(v, dimension.values[0], dimension.navigationRules);
            } else if (i === dimension.values.length - 1 && extents === 'bridged') {
                // we are at the end, create forwards bridge to new element
                createEdge(v, dimension.behavior.bridgePost, dimension.navigationRules);
            } else if (i < dimension.values.length - 1 && extents !== 'terminal') {
                // we are in the dimension but not at the end, create forwards step
                createEdge(v, dimension.values[i], dimension.navigationRules);
            }

            if (!i && extents === 'bridge') {
                // if we started the dimension and bridge is set, we need to create backwards bridge to new element
                createEdge(dimension.behavior.bridgePrevious, v, dimension.navigationRules);
            }
            i++;
        });
        // }
    });

    Object.keys(nodes).forEach(nodeKey => {
        const node = nodes[nodeKey];
        // for each node we want to find all the edges it has, so we need to search across dimensions (if they exist)

        if (node.derivedNode) {
            createEdge(
                node.id,
                dimensions[node.data.key].values[0].id,
                options.dimensions[node.data.key].navigationRules
            );
        }

        if (options.genericEdges?.length) {
            options.genericEdges.forEach(e => {
                if (!edges[e.edgeId]) {
                    edges[e.edgeId] = e.edge;
                }
                if ((e.conditional && e.conditional(node, e)) || !e.conditional) {
                    node.edges.push(e.edgeId);
                }
            });
        }
    });
    return edges;
};

export const buildRules = options => {
    return options.rules || GenericFullNavigationRules;
};

export const buildStructure = options => {
    let nodes = bulidNodes(options);
    let dimensions = scaffoldDimensions(options, nodes);
    let edges = buildEdges(options, nodes, dimensions);
    let navigationRules = buildRules(options);
    return {
        nodes,
        edges,
        dimensions,
        navigationRules
    };
};
