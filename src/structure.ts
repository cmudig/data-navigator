import { GenericLimitedNavigationRules } from './consts';
import { describeNode } from './utilities';

export default (options: StructureOptions) => {
    if (
        options.dataType === 'vega-lite' ||
        options.dataType === 'vl' ||
        options.dataType === 'Vega-Lite'
    ) {
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

export const buildNodeStructure = options => {
    // this will eventually be our generic method for dn.structure()

    // need to convert to a graph structure!

    return {};
};
