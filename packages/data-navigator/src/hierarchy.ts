import type { Edges, HierarchyInfo, NodeId, Nodes, StructureOptions } from './data-navigator';
import { makeEdgeCreator, chain } from './edge-utils';

/*
    Builds a deep tree from flat rows. Each row names its parent with options.hierarchy.parentKey.
    The row without a parent is the root. Every row becomes a navigable node.

    levelNavigation:
      'within' (default): sibling keys move between children of the same parent.
      'across': sibling keys move between every node at the same depth, crossing parents.
*/
export const buildHierarchy = (options: StructureOptions, nodes: Nodes, edges: Edges): HierarchyInfo | undefined => {
    const h = options.hierarchy;
    if (!h) return;
    const createEdge = makeEdgeCreator(nodes, edges, options.useDirectedEdges);
    const siblingRules = h.navigationRules?.sibling_sibling || ['left', 'right'];
    const parentRules = h.navigationRules?.parent_child || ['drill-out', 'drill-in'];
    const extents = h.extents || 'circular';
    const idOf = d => d[typeof options.idKey === 'function' ? options.idKey(d) : options.idKey];

    const children: Record<NodeId, Array<any>> = {};
    let rootId: NodeId | undefined;
    options.data.forEach(d => {
        const id = idOf(d);
        const parent = d[h.parentKey];
        if (parent === undefined || parent === null || parent === '') {
            if (rootId) {
                console.error(
                    `Building hierarchy. More than one root was found: ${rootId} and ${id}. Using ${rootId}.`
                );
                return;
            }
            rootId = id;
        } else {
            if (!children[parent]) children[parent] = [];
            children[parent].push(d);
        }
    });
    if (!rootId) {
        console.error('Building hierarchy. No root row was found. One row must have an empty parent.');
        return;
    }

    const byDepth: Array<Array<NodeId>> = [];
    const visit = (id: NodeId, parentId: NodeId | undefined, depth: number) => {
        const node = nodes[id];
        if (!node) {
            console.error(`Building hierarchy. Row ${id} has no node. Check idKey.`);
            return;
        }
        node.depth = depth;
        if (parentId) node.parentId = parentId;
        if (!byDepth[depth]) byDepth[depth] = [];
        byDepth[depth].push(id);

        let kids = children[id] || [];
        if (h.sortFunction) kids = [...kids].sort((a, b) => h.sortFunction(a, b));
        const kidIds = kids.map(idOf);
        node.childCount = kidIds.length;
        if (kidIds.length) {
            createEdge(id, kidIds[0], parentRules, 'source');
            kidIds.forEach(k => createEdge(id, k, parentRules, 'target'));
            if (h.levelNavigation !== 'across') {
                chain(createEdge, kidIds, siblingRules, extents);
            }
        }
        kidIds.forEach(k => visit(k, id, depth + 1));
    };
    visit(rootId, undefined, 0);

    if (h.levelNavigation === 'across') {
        byDepth.forEach(ids => chain(createEdge, ids, siblingRules, extents));
    }
    return { rootId, depthCount: byDepth.length, parentRules: parentRules as [string, string] };
};
