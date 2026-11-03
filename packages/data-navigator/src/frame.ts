import type { Edges, FrameInfo, NodeId, NodeObject, Nodes, StructureOptions } from './data-navigator';
import { makeEdgeCreator, chain } from './edge-utils';

/*
    A frame puts descriptive chart parts in front of the data:
        root -> title, subtitle, y axis, x axis, legend(s), data
    Only the data node has children. The data node holds whatever structure was built
    (one dimension, several dimensions, a spatial grid, or a hierarchy).
*/

// With 2 or more dimensions, the frame's data node becomes the dimensions' level 0 node.
export const prepareFrameOptions = (options: StructureOptions): StructureOptions => {
    const f = options.frame;
    const dimCount = options.dimensions?.values?.length || 0;
    if (!f || dimCount < 2 || options.dimensions.parentOptions?.addLevel0) {
        return options;
    }
    const data = f.data || ({ id: 'data', edges: [], semantics: { label: 'Data' } } as NodeObject);
    return {
        ...options,
        dimensions: {
            ...options.dimensions,
            parentOptions: {
                ...(options.dimensions.parentOptions || {}),
                addLevel0: { ...data, edges: data.edges || [] }
            }
        }
    };
};

export const buildFrame = (
    options: StructureOptions,
    nodes: Nodes,
    edges: Edges,
    topId: NodeId | undefined
): FrameInfo | undefined => {
    const f = options.frame;
    if (!f) return;
    if (!topId || !nodes[topId]) {
        console.error('Building frame. No top data node was found to place under the frame.');
        return;
    }
    const createEdge = makeEdgeCreator(nodes, edges, options.useDirectedEdges);
    const siblingRules = f.navigationRules?.sibling_sibling || ['left', 'right'];
    const parentRules = f.navigationRules?.parent_child || ['drill-out', 'drill-in'];
    const extents = f.behavior?.extents || 'circular';

    const root = f.root;
    nodes[root.id] = { ...root, edges: [...(root.edges || [])], depth: 0, frameRole: 'root' } as NodeObject;

    const elementIds = (f.elements || []).map(e => {
        nodes[e.id] = {
            ...e,
            edges: [...(e.edges || [])],
            depth: 1,
            parentId: root.id,
            frameRole: 'element'
        } as NodeObject;
        return e.id;
    });

    let dataId = topId;
    if (f.data && f.data.id !== topId) {
        // the data node wraps the top node
        nodes[f.data.id] = { ...f.data, edges: [...(f.data.edges || [])] } as NodeObject;
        createEdge(f.data.id, topId, parentRules, 'source');
        createEdge(f.data.id, topId, parentRules, 'target');
        nodes[topId].parentId = f.data.id;
        dataId = f.data.id;
    }
    const dataNode = nodes[dataId];
    dataNode.frameRole = 'data';
    dataNode.depth = 1;
    dataNode.parentId = root.id;

    const children = [...elementIds, dataId];
    createEdge(root.id, children[0], parentRules, 'source');
    children.forEach(c => createEdge(root.id, c, parentRules, 'target'));
    chain(createEdge, children, siblingRules, extents);

    return { rootId: root.id, elementIds, dataId, parentRules: parentRules as [string, string] };
};
