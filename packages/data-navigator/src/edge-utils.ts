import type { Edges, EdgeId, EdgeObject, NavigationList, NodeId, Nodes } from './data-navigator';

export type EdgeCreator = (source: NodeId, target: NodeId, rules?: NavigationList, addTo?: 'source' | 'target') => void;

/*
    Returns a createEdge function that matches the one used by the dimensions API.
    Rule pairs follow the library convention: [moveToSource, moveToTarget].
    addTo limits which node gets the edge (useful for one-way parent links).
*/
export const makeEdgeCreator = (nodes: Nodes, edges: Edges, useDirectedEdges?: boolean): EdgeCreator => {
    const addEdgeToNode = (nodeId: NodeId, edgeId: EdgeId) => {
        const node = nodes[nodeId];
        if (!node) {
            console.error(`Building edges. Node ${nodeId} does not exist, so edge ${edgeId} was not added to it.`);
            return;
        }
        if (!node.edges) {
            node.edges = [];
        }
        if (node.edges.indexOf(edgeId) === -1) {
            node.edges.push(edgeId);
        }
    };
    return (source, target, rules, addTo) => {
        if (!source || !target || source === target) {
            return;
        }
        const id: EdgeId = `${source}-${target}`;
        const targetId: EdgeId = !useDirectedEdges ? id : `${target}-${id}`;
        const addToSource = !addTo || addTo === 'source';
        const addToTarget = !addTo || addTo === 'target';
        const checkEdgeRules = (eId: EdgeId) => {
            if (edges[eId]) {
                (rules || []).forEach(r => {
                    if (edges[eId].navigationRules.indexOf(r) === -1) {
                        edges[eId].navigationRules.push(r);
                    }
                });
            } else {
                edges[eId] = {
                    source,
                    target,
                    navigationRules: rules ? [...rules] : []
                } as EdgeObject;
            }
        };
        checkEdgeRules(id);
        if (useDirectedEdges && addToTarget) {
            checkEdgeRules(targetId);
        }
        if (addToSource) {
            addEdgeToNode(source, id);
        }
        if (addToTarget) {
            addEdgeToNode(target, targetId);
        }
    };
};

// Links a list of node ids in order with sibling rules. Circular closes the loop.
export const chain = (
    createEdge: EdgeCreator,
    ids: Array<NodeId>,
    rules: NavigationList,
    extents: 'circular' | 'terminal' = 'terminal'
) => {
    for (let i = 0; i < ids.length - 1; i++) {
        createEdge(ids[i], ids[i + 1], rules);
    }
    if (extents === 'circular' && ids.length > 1) {
        createEdge(ids[ids.length - 1], ids[0], rules);
    }
};
