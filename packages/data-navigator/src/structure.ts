import {
    GenericLimitedNavigationRules,
    GenericFullNavigationRules,
    GenericFullNavigationDimensions,
    TypicallyUnreservedKeys,
    TypicallyUnreservedKeyPairs,
    SemanticKeys
} from './consts';
import {
    StructureOptions,
    EdgeList,
    Structure,
    Nodes,
    Dimensions,
    Edges,
    EdgeObject,
    EdgeId,
    NodeObject,
    NodeId,
    NavigationList,
    DimensionObject,
    DivisionObject,
    DatumObject,
    ChildmostMatchingStrategy
} from './data-navigator';
import { describeNode, createValidId } from './utilities';

export default (options: StructureOptions): Structure => {
    if (options.dataType === 'vega-lite' || options.dataType === 'vl' || options.dataType === 'Vega-Lite') {
        return buildNodeStructureFromVegaLite(options);
    } else {
        return buildStructure(options);
    }
};

export const buildNodeStructureFromVegaLite = (options): Structure => {
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
        elementData[renderId].spatialProperties = {};
        elementData[renderId].spatialProperties.x = item.bounds.x1 + o[0];
        elementData[renderId].spatialProperties.y = item.bounds.y1 + o[1];
        elementData[renderId].spatialProperties.width = item.bounds.x2 - item.bounds.x1;
        elementData[renderId].spatialProperties.height = item.bounds.y2 - item.bounds.y1;
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
    } as Structure;
};

/*
    this function creates an index for every datum in options.data,
    adds that index to the datum (mutating the datum directly),
    optionally can count the number of times a datum's keys have
    already been seen in other datum, and will also (if a string),
    count the number of times the value of that key has been seen
*/
export const addSimpleDataIDs = (options: StructureOptions): void => {
    let i = 0;
    let keyCounter = {};
    options.data.forEach(d => {
        const id = typeof options.idKey === 'function' ? options.idKey(d) : options.idKey;
        d[id] = '_' + i;
        if (options.keysForIdGeneration) {
            options.keysForIdGeneration.forEach(k => {
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
export const buildNodes = (options: StructureOptions): Nodes => {
    let nodes = {};
    // this will eventually be our generic method for dn.structure()

    // convert all data to a graph structure!
    options.data.forEach(d => {
        if (!options.idKey) {
            console.error(
                `Building nodes. A key string must be supplied in options.idKey to specify the id keys of every node.`
            );
        }

        const idKey = typeof options.idKey === 'function' ? options.idKey(d) : options.idKey;
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
                typeof options.renderIdKey === 'function' ? options.renderIdKey(d) : options.renderIdKey;
            nodes[id] = {
                id: id,
                edges: [],
                renderId: renderIdKey ? d[renderIdKey] || '' : d.renderIdKey || '',
                data: d
            } as NodeObject;
        } else {
            console.error(
                `Building nodes. Each id for data in options.data must be unique. This id is not unique: ${id}.`
            );
            return;
        }
    });

    return nodes as Nodes;
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
export const scaffoldDimensions = (options: StructureOptions, nodes: Nodes): Dimensions => {
    let dimensions = {};

    // step 0, if we want to have a level 0 in our structure, we need to create a node for it!
    if (options.dimensions?.parentOptions?.addLevel0) {
        let level0 = options.dimensions.parentOptions.addLevel0;
        nodes[level0.id] = { ...level0, dimensionLevel: 0 } as NodeObject;
    }

    let rules = [...GenericFullNavigationDimensions];

    const setExtents = (val: number, dim: DimensionObject) => {
        let min = dim.numericalExtents[0];
        let max = dim.numericalExtents[1];
        dim.numericalExtents[0] = min < val ? min : val;
        dim.numericalExtents[1] = max > val ? max : val;
    };
    // for every datum, check against filters, create parent dimensions, create divisions, and then add to divisions
    options.data.forEach(d => {
        let ods = options.dimensions?.values || [];
        let i = 0;
        console.log("ods",ods)
        ods.forEach(dim => {
            if (!dim.dimensionKey) {
                console.error(
                    `Building nodes, parsing dimensions. Each dimension in options.dimensions must contain a dimensionKey. This dimension has no key: ${JSON.stringify(
                        dim
                    )}.`
                );
                return;
            }
            if (dim.dimensionKey in d) {
                let value = d[dim.dimensionKey];
                // we need to check against our filter function to see if we keep this value
                let keepValue =
                    typeof dim.operations?.filterFunction === 'function' ? dim.operations.filterFunction(d, dim) : true;

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
                        let id =
                            typeof dim.nodeId === 'function'
                                ? dim.nodeId(dim, options.data)
                                : dim.nodeId || createValidId(dim.dimensionKey);
                        let renderId =
                            typeof dim.renderId === 'function' ? dim.renderId(dim, options.data) : dim.renderId || id;

                        // this is the dimension
                        dimensions[dim.dimensionKey] = {
                            dimensionKey: dim.dimensionKey,
                            nodeId: id,
                            divisions: {},
                            numericalExtents: [Infinity, -Infinity],
                            type: dim.type,
                            operations: {
                                compressSparseDivisions: dim.operations?.compressSparseDivisions || false,
                                sortFunction: dim.operations?.sortFunction || undefined
                            },
                            behavior: dim.behavior || {
                                extents: 'circular'
                            },
                            navigationRules: dim.navigationRules || {
                                sibling_sibling: rules.length
                                    ? [...rules.shift()]
                                    : ['previous_' + dim.dimensionKey, 'next_' + dim.dimensionKey],
                                parent_child: ['parent_' + dim.dimensionKey, 'child']
                            }
                        } as DimensionObject;

                        // we want to add a node for the dimension's root
                        nodes[id] = {
                            id,
                            renderId,
                            derivedNode: dim.dimensionKey,
                            edges: [],
                            dimensionLevel: 1,
                            data: dimensions[dim.dimensionKey],
                            renderingStrategy: dim.renderingStrategy || 'singleSquare' // not sure what defaults we want yet
                        } as NodeObject;
                    }
                    let dimension = dimensions[dim.dimensionKey] as DimensionObject;

                    let targetDivision: any = null;
                    // step 2: if this is categorical, we check if value's division exists (if not, we make it)
                    if (dim.type === 'categorical') {
                        let divisionId =
                            typeof dim.divisionOptions?.divisionNodeIds === 'function'
                                ? dim.divisionOptions.divisionNodeIds(dim.dimensionKey, value, i)
                                : createValidId(dimension.nodeId + '_' + value);
                        targetDivision = dimension.divisions[divisionId];
                        if (!targetDivision) {
                            targetDivision = dimension.divisions[divisionId] = {
                                id: divisionId,
                                sortFunction: dim.divisionOptions?.sortFunction || undefined,
                                values: {}
                            } as DivisionObject;

                            let divisionRenderId =
                                typeof dim.divisionOptions?.divisionRenderIds === 'function'
                                    ? dim.divisionOptions.divisionRenderIds(dim.dimensionKey, value, i)
                                    : divisionId;
                            nodes[divisionId] = {
                                id: divisionId,
                                renderId: divisionRenderId,
                                derivedNode: dim.dimensionKey,
                                edges: [],
                                dimensionLevel: 2,
                                data: { ...targetDivision } as DatumObject,
                                renderingStrategy: dim.divisionOptions?.renderingStrategy || 'singleSquare' // not sure what defaults we want yet
                            } as NodeObject;
                            nodes[divisionId].data[dim.dimensionKey] = value;
                        }
                    } else {
                        // if this isn't categorical, we create a generic division (for now) and will split later
                        targetDivision = dimension.divisions[dimension.nodeId] as DivisionObject;
                        if (!targetDivision) {
                            targetDivision = dimension.divisions[dimension.nodeId] = {
                                id: dimension.nodeId,
                                sortFunction: dim.divisionOptions?.sortFunction || undefined,
                                values: {}
                            } as DivisionObject;
                        }

                        // step 3: if numerical, keep track of min/max as we go so we can create divisions after this loop
                        // we then need to start checking extents!
                        // first, we need to check if operations exist, otherwise we need to make it
                        if (!dim.operations) {
                            dim.operations = {};
                        }
                        // we need to make sure operations' numericalSubdivisions at least has a valid value
                        // subdivs can be a function or number, but if it is a number, we coerce it into 1 or greater
                        let subdivs = dim.operations.createNumericalSubdivisions;
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
                    const id = typeof options.idKey === 'function' ? options.idKey(d) : options.idKey;
                    targetDivision.values[d[id]] = d;
                }
            }
            i++;
        });
    });

    // create division points using min and max (if numerical)
    // sort the dimensions' divisions
    Object.keys(dimensions).forEach(s => {
        let dimension = dimensions[s] as DimensionObject;
        let divisions = dimension.divisions;

        if (dimension.type === 'numerical') {
            // we want to sort ALL the values if it is numerical

            divisions[dimension.nodeId].values = Object.fromEntries(
                Object.entries(divisions[dimension.nodeId].values).sort((a, b) => {
                    return typeof dimension.operations?.sortFunction === 'function'
                        ? dimension.operations.sortFunction(a[1], b[1], dimension)
                        : a[1][s] - b[1][s];
                })
            );
            let values = divisions[dimension.nodeId].values;

            // we need to create subdivisions and remove the original
            if (dimension.numericalExtents[0] !== Infinity && dimension.subdivisions !== 1) {
                let valueKeys = Object.keys(values);
                let subDivisions =
                    typeof dimension.subdivisions === 'function'
                        ? dimension.subdivisions(s, values)
                        : dimension.subdivisions;
                let range = dimension.numericalExtents[1] - dimension.numericalExtents[0];
                let interval = range / subDivisions;
                let i = dimension.numericalExtents[0] + interval;
                let divisionCount = 0;
                let index = 0;
                let lastDivisionId: string | null = null;
                let prevBound = dimension.numericalExtents[0];
                for (i = dimension.numericalExtents[0] + interval; i <= dimension.numericalExtents[1]; i += interval) {
                    // first, we create each subdivision
                    let divisionId =
                        typeof dimension.divisionOptions?.divisionNodeIds === 'function'
                            ? dimension.divisionOptions.divisionNodeIds(s, i, i)
                            : createValidId(dimension.nodeId + '_' + i);

                    lastDivisionId = divisionId;

                    dimension.divisions[divisionId] = {
                        id: divisionId,
                        sortFunction: dimension.divisionOptions?.sortFunction || undefined,
                        values: {},
                        numericalExtents: [prevBound, i]
                    } as DivisionObject;

                    let divisionRenderId =
                        typeof dimension.divisionOptions?.divisionRenderIds === 'function'
                            ? dimension.divisionOptions.divisionRenderIds(s, i, i)
                            : divisionId;
                    // we want to make a node for these subdivisions
                    nodes[divisionId] = {
                        id: divisionId,
                        renderId: divisionRenderId,
                        derivedNode: s,
                        edges: [],
                        data: dimension.divisions[divisionId],
                        dimensionLevel: 2,
                        renderingStrategy: dimension.divisionOptions?.renderingStrategy || 'singleSquare' // not sure what defaults we want yet
                    } as NodeObject;

                    let limit = false;
                    while (!limit && index < valueKeys.length) {
                        let node = values[valueKeys[index]];
                        let value = node[s];
                        if (value <= i) {
                            dimension.divisions[divisionId].values[node.id] = node;
                            index++;
                        } else {
                            // Node belongs to a later bin — do not advance index so it
                            // is re-evaluated in the next iteration of the for-loop.
                            limit = true;
                        }
                    }
                    prevBound = i;
                    divisionCount++;
                }
                // Flush any points that floated past the last bin boundary due to
                // floating-point accumulation (e.g. 4.7 + 4×0.6 = 7.099... < 7.1).
                if (lastDivisionId && index < valueKeys.length) {
                    while (index < valueKeys.length) {
                        let node = values[valueKeys[index]];
                        dimension.divisions[lastDivisionId].values[node.id] = node;
                        index++;
                    }
                }
                delete divisions[s];
            }
        } else if (typeof dimension.operations?.sortFunction === 'function') {
            // otherwise, we sort the keys of the categorical divisions
            dimension.divisions = Object.fromEntries(
                Object.entries(divisions).sort((a, b) => {
                    return dimension.operations.sortFunction(a[1], b[1], dimension);
                })
            );
        }

        // if sub-division sorting functions are passed, we can run those now
        let divisionKeys = Object.keys(dimension.divisions);
        divisionKeys.forEach(d => {
            let division = dimension.divisions[d] as DivisionObject;
            if (typeof division.sortFunction === 'function') {
                division.values = Object.fromEntries(
                    Object.entries(division.values).sort((a, b) => {
                        return division.sortFunction(a[1], b[1], division);
                    })
                );
            }
        });
    });

    // penultimate step: check each dimension after sorting and filtering,
    // if operations.compressSparseDivisions is true, we check divisions and compress
    Object.keys(dimensions).forEach(s => {
        let dimension = dimensions[s] as DimensionObject;

        if (dimension.operations.compressSparseDivisions) {
            const divisionKeys = Object.keys(dimension.divisions);
            const values = {};
            let sparse = true;
            divisionKeys.forEach(d => {
                const division = dimension.divisions[d] as DivisionObject;
                const valueKeys = Object.keys(division.values);
                if (valueKeys.length <= 1) {
                    valueKeys.forEach(vk => {
                        values[vk] = { ...division.values[vk] };
                    });
                } else {
                    sparse = false;
                }
            });
            if (sparse) {
                // we clear all the divisions that used to exist and replace it with a single division
                // later, when edges are being built, this will be skipped (same as numerical divisions with 1 subdiv)
                const newDivision = {
                    id: dimension.nodeId,
                    values
                };
                // we need to delete nodes of the old divisions
                divisionKeys.forEach(d => {
                    delete nodes[d];
                });
                dimension.divisions = {};
                dimension.divisions[dimension.nodeId] = newDivision;
            }
        }
    });

    // final step: if any addition adjustments are to be made, then a callback is used at this point
    if (options.dimensions?.adjustDimensions) {
        dimensions = options.dimensions.adjustDimensions(dimensions);
    }

    return dimensions as Dimensions;
};

export const buildEdges = (options: StructureOptions, nodes: Nodes, dimensions?: Dimensions): Edges => {
    let edges = {};

    const addEdgeToNode = (nodeId, edgeId) => {
        if (nodes[nodeId].edges.indexOf(edgeId) === -1) {
            nodes[nodeId].edges.push(edgeId);
        }
    };

    const createEdge = (source: NodeId, target: NodeId, rules?: NavigationList, addTo?: string): void => {
        const id: EdgeId = `${source}-${target}`;
        let targetId: EdgeId = !options.useDirectedEdges ? id : `${target}-${id}`;
        let addToSource = !addTo || addTo === 'source';
        let addToTarget = !addTo || addTo === 'target';

        const checkEdgeRules = eId => {
            if (edges[eId]) {
                // edge already exists, add new rules to edge
                edges[eId].navigationRules.push(...(rules || []));
            } else {
                // create edge object
                edges[eId] = {
                    source,
                    target,
                    navigationRules: rules ? [...rules] : []
                } as EdgeObject;
            }
        };
        checkEdgeRules(id);
        if (options.useDirectedEdges && addToTarget) {
            checkEdgeRules(targetId);
        }
        if (addToSource) {
            // we add the edge we created to the source node
            addEdgeToNode(source, id);
        }
        if (addToTarget) {
            // we add the edge we created to the target node
            addEdgeToNode(target, targetId);
        }
    };

    if (dimensions && Object.keys(dimensions).length) {
        const dimensionKeys = Object.keys(dimensions);
        const hasOrder = options.dimensions?.parentOptions?.level1Options?.order;
        let order = hasOrder || dimensionKeys;
        let l = 0;
        let po = options.dimensions?.parentOptions || {};
        let extents = po.level1Options?.behavior?.extents || 'terminal';
        let level0 = po.addLevel0;
        let parentRules = level0 ? po.level1Options?.navigationRules?.parent_child || ['parent', 'child'] : [];
        let siblingRules = po.level1Options?.navigationRules?.sibling_sibling || ['left', 'right'];
        let firstLevel1Node: NodeObject =
            typeof order[0] === 'string' ? (hasOrder ? nodes[order[0]] : nodes[dimensions[order[0]].nodeId]) : order[0];
        if (level0) {
            // we make a way for the level0 to go to the first child
            createEdge(level0.id, firstLevel1Node.id, parentRules, 'source');
        }
        order.forEach(n => {
            let level1Node: NodeObject =
                typeof n === 'string' ? (hasOrder ? nodes[n] : nodes[dimensions[n].nodeId]) : n;
            if (level1Node === n && !nodes[level1Node.id]) {
                // since the order list allows creation of nodes at level 1, we add them here if passed in and not already part of nodes
                nodes[level1Node.id] = level1Node;
            }
            // the first thing that every dimension needs is a one-way connection to the level0 node, if it exists
            if (level0) {
                // in an undirected graph, we always have parents as the source and children as targets
                // but the child is the node that should have this edge added
                if (!options.useDirectedEdges) {
                    createEdge(level0.id, level1Node.id, parentRules, 'target');
                } else {
                    createEdge(level1Node.id, level0.id, parentRules, 'source');
                }
            }

            if (l === order.length - 1 && extents === 'circular') {
                // we are at the end, create forwards loop to start of list
                createEdge(level1Node.id, firstLevel1Node.id, siblingRules);
            } else if (l === order.length - 1 && extents === 'bridgedCustom') {
                // we are at the end, create forwards bridge to new element
                createEdge(level1Node.id, po.level1Options.behavior.customBridgePost, siblingRules);
            } else if (l < order.length - 1) {
                // we are in level1 but not at the end, create forwards step

                // @ts-ignore: for some reason the same use of conditional check works above for order[0] (firstLevel1Node) but not for l+1 here
                let nextLevel1Node: NodeObject =
                    typeof order[l + 1] === 'string'
                        ? hasOrder
                            ? // @ts-ignore: for some reason the same use of conditional check works above for order[0] (firstLevel1Node) but not for l+1 here
                              nodes[order[l + 1]]
                            : // @ts-ignore: for some reason the same use of conditional check works above for order[0] (firstLevel1Node) but not for l+1 here
                              nodes[dimensions[order[l + 1]].nodeId]
                        : order[l + 1];
                createEdge(level1Node.id, nextLevel1Node.id, siblingRules);
            }

            if (!l && extents === 'bridgedCustom') {
                // if we started the dimension and bridge is set, we need to create backwards bridge to new element
                createEdge(po.level1Options.behavior.customBridgePost, level1Node.id, siblingRules);
            }
            l++;
        });

        // now that level1 (dimensions plus optional stuff) and the root are taken care of, we handle divisions + children
        dimensionKeys.forEach(s => {
            const dimension = dimensions[s];
            const strat = dimension.behavior?.childmostNavigation || 'within'; // we default to within
            const matchByIndex: ChildmostMatchingStrategy = (i, _a, _b, c) => {
                return c.values[Object.keys(c.values)[i]] || undefined;
            };
            const match =
                strat === 'across' && dimension.behavior?.childmostMatching
                    ? dimension.behavior?.childmostMatching
                    : matchByIndex; // by default we just match by index
            let extents = dimension.behavior?.extents || 'circular'; // we default to circular

            if (!dimension.divisions) {
                console.error(
                    `Parsing dimensions. The dimension using the key ${s} is missing the divisions property. dimension.divisions should be supplied. ${JSON.stringify(
                        dimension
                    )}.`
                );
            }
            let divisionKeys = Object.keys(dimension.divisions);

            // since we already looped over level1 and made connections up,
            // the first thing a dimension needs is a one-way connection to its first division
            // if there is only one division, we skip it and go straight to the first child of that division
            const firstDivision = dimension.divisions[divisionKeys[0]];
            if (divisionKeys.length !== 1) {
                createEdge(dimension.nodeId, firstDivision.id, dimension.navigationRules.parent_child, 'source');
            } else {
                let valueKeys = Object.keys(firstDivision.values);
                let firstChildId =
                    typeof options.idKey === 'function'
                        ? options.idKey(firstDivision.values[valueKeys[0]])
                        : options.idKey;

                createEdge(
                    dimension.nodeId,
                    firstDivision.values[valueKeys[0]][firstChildId],
                    dimension.navigationRules.parent_child,
                    'source'
                );
            }

            /*
                In the below loop, we are creating an edge between the current element and the next element
                in the dimension. We only ever add links forward, since (like a linked list), the edges go
                both ways. However, we DO need to check for a backwards bridge at the start, which could
                end up creating some kind of double-edge situation. This needs more testing to figure out
                the correct approach moving forward.
            */
            let j = 0;
            divisionKeys.forEach(d => {
                let division = dimension.divisions[d] as DivisionObject;

                // we need to connect divisions and make them navigable!
                if (
                    j === divisionKeys.length - 1 &&
                    (extents === 'circular' || extents === 'bridgedCousins' || extents === 'bridgedCustom')
                ) {
                    // we are at the end, create forwards loop to start of list
                    createEdge(
                        division.id,
                        dimension.divisions[divisionKeys[0]].id,
                        dimension.navigationRules.sibling_sibling
                    );
                } else if (j < divisionKeys.length - 1) {
                    // we are in the division but not at the end, create forwards step
                    createEdge(
                        division.id,
                        dimension.divisions[divisionKeys[j + 1]].id,
                        dimension.navigationRules.sibling_sibling
                    );
                }

                let valueKeys = Object.keys(division.values);

                // every division needs to go up to parent and down to first child

                // in an undirected graph, we always have parents as the source and children as targets
                if (!options.useDirectedEdges) {
                    createEdge(dimension.nodeId, division.id, dimension.navigationRules.parent_child, 'target');
                } else {
                    createEdge(division.id, dimension.nodeId, dimension.navigationRules.parent_child, 'source');
                }

                // set up edge to first child (skip if this bin is empty — no data in range)
                if (valueKeys.length > 0) {
                    const firstChildId =
                        typeof options.idKey === 'function' ? options.idKey(division.values[valueKeys[0]]) : options.idKey;
                    createEdge(
                        division.id,
                        division.values[valueKeys[0]][firstChildId],
                        dimension.navigationRules.parent_child,
                        'source'
                    );
                }

                // lastly, we prep the childmost level
                let i = 0;
                if (valueKeys.length >= 1) {
                    valueKeys.forEach(vk => {
                        let v = division.values[vk] as DatumObject;
                        const id = typeof options.idKey === 'function' ? options.idKey(v) : options.idKey;
                        // every child needs to be able to go up to their parent
                        // just like at the dimension level, if we only have 1 division, we need to make sure we
                        // create an edge from the children up to the dimension level and skip the division parent
                        let parentId = divisionKeys.length !== 1 ? division.id : dimension.nodeId;
                        // in an undirected graph, we always have parents as the source and children as targets
                        if (!options.useDirectedEdges) {
                            createEdge(parentId, v[id], dimension.navigationRules.parent_child, 'target');
                        } else {
                            createEdge(v[id], parentId, dimension.navigationRules.parent_child, 'source');
                        }

                        if (strat === 'within') {
                            // childmost elements of a division use their navigation rules to navigate to each other
                            // this navigation stays "within" the division (compared to "across" divisions)
                            // this strategy makes sense for hierarchies, single-dimension charts, and sets
                            if (i === valueKeys.length - 1 && extents === 'circular') {
                                // we are at the end, create forwards loop to start of list
                                const targetId =
                                    typeof options.idKey === 'function'
                                        ? options.idKey(division.values[valueKeys[0]])
                                        : options.idKey;
                                createEdge(
                                    v[id],
                                    division.values[valueKeys[0]][targetId],
                                    dimension.navigationRules.sibling_sibling
                                );
                            } else if (i === valueKeys.length - 1 && extents === 'bridgedCousins') {
                                if (j !== divisionKeys.length - 1) {
                                    // we are at the end of values but not divisions, create forwards bridge to the first child of the next division
                                    const targetId =
                                        typeof options.idKey === 'function'
                                            ? options.idKey(
                                                  dimension.divisions[divisionKeys[j + 1]].values[valueKeys[0]]
                                              )
                                            : options.idKey;
                                    createEdge(
                                        v[id],
                                        dimension.divisions[divisionKeys[j + 1]].values[valueKeys[0]][targetId],
                                        dimension.navigationRules.sibling_sibling
                                    );
                                } else {
                                    // we are at the end of values and divisions, create forwards bridge to the first child of the first division
                                    const targetId =
                                        typeof options.idKey === 'function'
                                            ? options.idKey(dimension.divisions[divisionKeys[0]].values[valueKeys[0]])
                                            : options.idKey;
                                    createEdge(
                                        v[id],
                                        dimension.divisions[divisionKeys[0]].values[valueKeys[0]][targetId],
                                        dimension.navigationRules.sibling_sibling
                                    );
                                }
                            } else if (i === valueKeys.length - 1 && extents === 'bridgedCustom') {
                                // we are at the end, create forwards bridge to new element
                                createEdge(
                                    v[id],
                                    dimension.behavior.customBridgePost,
                                    dimension.navigationRules.sibling_sibling
                                );
                            } else if (i < valueKeys.length - 1) {
                                // we are in the dimension but not at the end, create forwards step
                                const targetId =
                                    typeof options.idKey === 'function'
                                        ? options.idKey(division.values[valueKeys[i + 1]])
                                        : options.idKey;
                                createEdge(
                                    v[id],
                                    division.values[valueKeys[i + 1]][targetId],
                                    dimension.navigationRules.sibling_sibling
                                );
                            }

                            if (!i && extents === 'bridgedCousins') {
                                if (j !== 0) {
                                    // we are at the start of values (but not divisions) and bridge is set, we need to create backwards bridge to the previous division's last child
                                    const targetId =
                                        typeof options.idKey === 'function'
                                            ? options.idKey(
                                                  dimension.divisions[divisionKeys[j - 1]].values[
                                                      valueKeys[valueKeys.length - 1]
                                                  ]
                                              )
                                            : options.idKey;
                                    createEdge(
                                        dimension.divisions[divisionKeys[j - 1]].values[
                                            valueKeys[valueKeys.length - 1]
                                        ][targetId],
                                        v[id],
                                        dimension.navigationRules.sibling_sibling
                                    );
                                } else {
                                    // we are at the start of values and divivions and bridge is set, we need to create backwards bridge to the last division's last child
                                    const targetId =
                                        typeof options.idKey === 'function'
                                            ? options.idKey(
                                                  dimension.divisions[divisionKeys[divisionKeys.length - 1]].values[
                                                      valueKeys[valueKeys.length - 1]
                                                  ]
                                              )
                                            : options.idKey;
                                    createEdge(
                                        dimension.divisions[divisionKeys[divisionKeys.length - 1]].values[
                                            valueKeys[valueKeys.length - 1]
                                        ][targetId],
                                        v[id],
                                        dimension.navigationRules.sibling_sibling
                                    );
                                }
                            } else if (!i && extents === 'bridgedCustom') {
                                // if we started the dimension and bridge is set, we need to create backwards bridge to new element
                                createEdge(
                                    dimension.behavior.customBridgePrevious,
                                    v[id],
                                    dimension.navigationRules.sibling_sibling
                                );
                            }
                        } else {
                            // we navigate "across" divisions, rather than "within," at the childmost level
                            // this type makes the most sense for common visualizations like stacked bars, line charts, etc
                            // note: extents cannot be "bridgedCousins" since we are already navigating across cousins

                            if (j === divisionKeys.length - 1 && extents === 'bridgedCustom') {
                                // we are at the end of our divisions and we are using a custom bridge
                                // create forwards bridge to new element
                                createEdge(
                                    v[id],
                                    dimension.behavior.customBridgePost,
                                    dimension.navigationRules.sibling_sibling
                                );
                            } else if (!j && extents === 'bridgedCustom') {
                                // if we started the divisions and bridge is set, we need to create backwards bridge to new element
                                createEdge(
                                    dimension.behavior.customBridgePrevious,
                                    v[id],
                                    dimension.navigationRules.sibling_sibling
                                );
                            } else {
                                // if we aren't using custom bridges and at the ends, then we run this block

                                // first, we determine which division to use
                                const targetDivision =
                                    j === divisionKeys.length - 1 && extents === 'circular'
                                        ? dimension.divisions[divisionKeys[0]]
                                        : dimension.divisions[divisionKeys[j + 1]];

                                if (targetDivision) {
                                    // it is possible that we don't have a target division!
                                    // but most of the time we do, so proceed:
                                    const target = match(i, v[id], division, targetDivision);

                                    // it is also possible we don't have a target, since this matches using a function
                                    if (target) {
                                        const targetId =
                                            typeof options.idKey === 'function' ? options.idKey(target) : options.idKey;
                                        createEdge(v[id], target[targetId], dimension.navigationRules.sibling_sibling);
                                    }
                                }
                            }
                        }
                        i++;
                    });
                }
                j++;
            });
        });
    }

    Object.keys(nodes).forEach(nodeKey => {
        const node = nodes[nodeKey];
        if (options.genericEdges?.length) {
            options.genericEdges.forEach(e => {
                if (!edges[e.edgeId]) {
                    edges[e.edgeId] = e.edge;
                }
                if (!e.conditional || (e.conditional && e.conditional(node, e))) {
                    node.edges.push(e.edgeId);
                }
            });
        }
    });
    return edges as Edges;
};

export const buildRules = (options: StructureOptions, edges: Edges, dimensions: Dimensions) => {
    let rules = options.navigationRules;
    if (!rules) {
        let dimKeys = Object.keys(dimensions || {});
        if (dimKeys.length > 6) {
            console.error(
                `Building navigationRules. Dimension count is too high to automatically generate key commands. It is recommend you reduce your dimensions to 6 or fewer for end-user experience. If not, you must provide your own navigation rules in options.navigationRules. Details: Count is ${
                    dimKeys.length
                }. Dimensions counted: ${dimKeys.join(', ')}.`
            );
        }
        let importedRules = {};
        let used = {};
        let needsKeys = {};
        let sparePairs = [...TypicallyUnreservedKeyPairs];
        let spareKeys = [...TypicallyUnreservedKeys];
        const checkKeys = (k1, k2?) => {
            let isPair = k1 && k2;
            let k1Assigned = false;
            let k2Assigned = false;
            if (importedRules[k1] || used[k1]) {
                used[k1] = { ...importedRules[k1] };
                k1Assigned = true;
            }
            if (k2 && (importedRules[k2] || used[k2])) {
                used[k2] = { ...importedRules[k2] };
                k2Assigned = true;
            }
            if (isPair && !k1Assigned && !k2Assigned) {
                if (!sparePairs.length) {
                    console.error(
                        `Building navigationRules. Dimension count is too high to automatically generate key commands, we have run out of keyboard key pairs to assign. You must either provide your own navigation rules in options.navigationRules, provide rules when generating dimensions, or reduce dimension count.`
                    );
                }
                let pair = [...sparePairs.shift()];
                spareKeys.splice(spareKeys.indexOf(pair[0]), 1);
                spareKeys.splice(spareKeys.indexOf(pair[1]), 1);

                used[k1] = {
                    direction: options.useDirectedEdges ? 'target' : 'source',
                    key: pair[0]
                };
                used[k2] = {
                    direction: 'target',
                    key: pair[1]
                };
            } else {
                if (!used[k1] && spareKeys.length) {
                    let key = spareKeys.shift();
                    let newPairs = [];
                    sparePairs.forEach(p => {
                        if (key !== p[0] && key !== p[1]) {
                            newPairs.push(p);
                        }
                    });
                    sparePairs = newPairs;
                    used[k1] = {
                        direction: options.useDirectedEdges ? 'target' : 'source',
                        key: key
                    };
                }
                if (k2 && !used[k2] && spareKeys.length) {
                    let key = spareKeys.shift();
                    let newPairs = [];
                    sparePairs.forEach(p => {
                        if (key !== p[0] && key !== p[1]) {
                            newPairs.push(p);
                        }
                    });
                    sparePairs = newPairs;
                    used[k2] = {
                        direction: 'target',
                        key: key
                    };
                }
                if (!spareKeys.length) {
                    if (!used[k1]) {
                        needsKeys[k1] = k1;
                    }
                    if (k2 && !used[k2]) {
                        needsKeys[k2] = k2;
                    }
                }
            }
        };
        // import rules
        Object.keys(GenericFullNavigationRules).forEach(r => {
            let rule = { ...GenericFullNavigationRules[r] };
            if (options.useDirectedEdges) {
                // if edges are directed, then every rule moves from towards the target
                rule.direction = 'target';
            }
            importedRules[r] = rule;
        });

        // find every rule created across all dimensions
        // check if found rules have keys assigned already in import
        // if no key assigned, assign a new key
        if (dimKeys.length) {
            // first check for level0, then loop over dimensions
            if (options.dimensions?.parentOptions?.addLevel0) {
                let rules = options.dimensions.parentOptions.level1Options?.navigationRules?.parent_child || [
                    'parent',
                    'child'
                ];
                checkKeys(rules[0], rules[1]);
            }
            dimKeys.forEach(d => {
                let pc = dimensions[d].navigationRules.parent_child;
                let ss = dimensions[d].navigationRules.sibling_sibling;
                checkKeys(pc[0], pc[1]);
                checkKeys(ss[0], ss[1]);
            });
        }

        // now check edges for any missing rules (typically from genericEdges)
        Object.keys(edges).forEach(e => {
            edges[e].navigationRules.forEach(rule => {
                if (!used[rule]) {
                    checkKeys(rule);
                }
            });
        });

        // check if any keys were unused from imports, those can now be assigned
        // if keys are still needed, throw error
        if (Object.keys(needsKeys).length) {
            let usedKeys = {};
            Object.keys(used).forEach(k => {
                usedKeys[used[k].key] = used[k].key;
            });
            Object.keys(importedRules).forEach(r => {
                if (!usedKeys[importedRules[r].key] && !SemanticKeys[importedRules[r].key]) {
                    spareKeys.push(importedRules[r].key);
                }
            });
            let recheckKeys = { ...needsKeys };
            needsKeys = {};
            Object.keys(recheckKeys).forEach(key => {
                checkKeys(key);
            });
            if (Object.keys(needsKeys).length) {
                console.error(
                    `Building navigationRules. There are no more keys left to assign automatically. Recommended fixes: use fewer dimensions, use fewer GenericEdges, or build your own navigationRules. Rules remaining without keyboard keys: ${Object.keys(
                        needsKeys
                    ).join(', ')}.`
                );
            }
        }
        rules = used;
    }
    return rules;
};

export const buildStructure = (options: StructureOptions): Structure => {
    if (options.addIds) {
        addSimpleDataIDs(options);
    }
    let nodes = buildNodes(options);
    let dimensions = scaffoldDimensions(options, nodes);
    let edges = buildEdges(options, nodes, dimensions);
    let navigationRules = buildRules(options, edges, dimensions);
    return {
        nodes,
        edges,
        dimensions,
        navigationRules
    } as Structure;
};
