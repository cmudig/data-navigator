import type { SkeletonNode, SkeletonEdge } from '../store/appState';

export interface StructureInput {
    nodes: Map<string, SkeletonNode>;
    edges: Map<string, SkeletonEdge>;
    entryNodeId?: string | null;
}

/*
 * Converts the skeleton's internal SkeletonNode/SkeletonEdge maps into a
 * data-navigator v2.4.0 Structure object.
 *
 * PRIMARY USE: extracting elementData (spatial positions) for the rendering overlay.
 * FALLBACK USE: navigation structure for purely manual graphs (no schema run).
 *
 * For schema-generated graphs, Step3_Testing reads appState.dnStructure directly
 * (the raw DN result from SchemaPanel). That preserves the correct per-node edge
 * membership set by addEdgeToNode() in the DN library — something toStructure()
 * cannot reconstruct, since SkeletonEdge only stores source/target, not which
 * nodes hold the edge.
 */

export interface DNStructure {
    nodes: Record<string, DNNode>;
    edges: Record<string, DNEdge>;
    navigationRules: Record<string, DNNavRule>;
    elementData: Record<string, DNRenderObject>;
}

export interface DNNode {
    id: string;
    renderId: string;
    edges: string[];
    dimensionLevel?: number;
    data: Record<string, unknown>;
    semantics: { label: string };
    [key: string]: unknown;
}

export interface DNEdge {
    source: string;
    target: string;
    navigationRules: string[];
    edgeId: string;
}

export interface DNNavRule {
    key: string;
    direction: 'source' | 'target';
}

export interface DNRenderObject {
    spatialProperties: { x: number; y: number; width: number; height: number; path?: string };
    semantics: { label: string; elementType: string; role: string };
    cssClass?: string;
}

export interface ValidationError {
    field: string;
    message: string;
}

// Direction → { key, direction } mapping (DN convention: source=backward, target=forward)
const DIRECTION_KEY_MAP: Record<string, DNNavRule> = {
    left: { key: 'ArrowLeft', direction: 'source' },
    right: { key: 'ArrowRight', direction: 'target' },
    up: { key: 'ArrowUp', direction: 'source' },
    down: { key: 'ArrowDown', direction: 'target' },
    exit: { key: 'Escape', direction: 'target' }
};

// Resolve {key:"f"} / {value:"f"} template tokens in a label string.
function resolveLabel(node: SkeletonNode): string {
    const { semantics, data } = node;
    let label = semantics.label
        .replace(/\{key:"([^"]+)"\}/g, (_, f: string) => (semantics.omitKeyNames ? '' : f))
        .replace(/\{value:"([^"]+)"\}/g, (_, f: string) => String(data[f] ?? ''))
        .trim();

    if (semantics.name) label = label ? `${label}. ${semantics.name}` : semantics.name;
    return label || node.label || node.id;
}

function buildNavigationRules(edges: Map<string, SkeletonEdge>): Record<string, DNNavRule> {
    const rules: Record<string, DNNavRule> = {};
    for (const edge of edges.values()) {
        const names: string[] =
            edge.navigationRuleNames && edge.navigationRuleNames.length > 0
                ? edge.navigationRuleNames
                : edge.direction !== 'custom'
                  ? [edge.direction]
                  : [];

        for (const name of names) {
            if (!(name in rules)) {
                rules[name] = DIRECTION_KEY_MAP[name] ??
                    DIRECTION_KEY_MAP[edge.direction] ?? { key: name, direction: 'target' };
            }
        }
    }
    return rules;
}

export function toStructure(state: StructureInput): DNStructure | null {
    const { nodes: skNodes, edges: skEdges } = state;
    if (skNodes.size === 0) return null;

    // Build nodes + elementData
    const nodes: Record<string, DNNode> = {};
    const elementData: Record<string, DNRenderObject> = {};

    for (const [id, skNode] of skNodes) {
        const renderId = skNode.renderId ?? id;
        const label = resolveLabel(skNode);

        nodes[id] = {
            id,
            renderId,
            edges: [],
            dimensionLevel: skNode.dnLevel,
            data: skNode.data,
            semantics: { label }
        };

        elementData[renderId] = {
            spatialProperties: {
                x: skNode.x,
                y: skNode.y,
                width: skNode.width,
                height: skNode.height,
                ...(skNode.renderProperties.shape === 'path' && skNode.pathData ? { path: skNode.pathData } : {})
            },
            semantics: {
                label,
                elementType: 'div',
                role: skNode.renderProperties.ariaRole || 'img'
            },
            ...(skNode.renderProperties.customClass ? { cssClass: skNode.renderProperties.customClass } : {})
        };
    }

    // Build edges + populate node edge lists
    const edges: Record<string, DNEdge> = {};

    for (const [id, skEdge] of skEdges) {
        const ruleNames: string[] =
            skEdge.navigationRuleNames && skEdge.navigationRuleNames.length > 0
                ? skEdge.navigationRuleNames
                : skEdge.direction !== 'custom'
                  ? [skEdge.direction]
                  : [];

        edges[id] = {
            source: skEdge.sourceId,
            target: skEdge.targetId,
            navigationRules: ruleNames,
            edgeId: id
        };

        // Fallback path: add edge to both source and target.
        // This is correct for the elementData use-case and for purely manual graphs.
        // Schema-generated graphs bypass this entirely — the testing page uses
        // appState.dnStructure directly, which has correct per-node membership
        // from the DN library (addEdgeToNode sets it per-node independently of
        // source/target designation on the edge).
        if (nodes[skEdge.sourceId]) nodes[skEdge.sourceId].edges.push(id);
        if (nodes[skEdge.targetId]) nodes[skEdge.targetId].edges.push(id);
    }

    const navigationRules = buildNavigationRules(skEdges);

    // Always include 'exit' so text-chat can recognise the command even when no exit edges exist
    if (!('exit' in navigationRules)) {
        navigationRules['exit'] = { key: 'Escape', direction: 'target' };
    }

    return { nodes, edges, navigationRules, elementData };
}

export function validateStructure(state: StructureInput): ValidationError[] {
    const errors: ValidationError[] = [];
    const { nodes, edges, entryNodeId } = state;

    if (!entryNodeId) {
        errors.push({ field: 'entryNodeId', message: 'No entry node set. Set one in the Editor before testing.' });
    } else if (!nodes.has(entryNodeId)) {
        errors.push({ field: 'entryNodeId', message: `Entry node "${entryNodeId}" not found in nodes.` });
    }

    for (const [id, node] of nodes) {
        const connectedEdgeCount = [...edges.values()].filter(e => e.sourceId === id || e.targetId === id).length;
        if (connectedEdgeCount === 0) {
            errors.push({ field: `node:${id}`, message: `Node "${node.label || id}" has no edges (isolated).` });
        }
    }

    return errors;
}
