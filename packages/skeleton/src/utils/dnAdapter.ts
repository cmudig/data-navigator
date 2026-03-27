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
// Used only for manual-graph fallback (no schema run). Schema-generated graphs get
// explicit navigationRules from buildDNStructure() in SchemaPanel.
const DIRECTION_KEY_MAP: Record<string, DNNavRule> = {
    left: { key: 'ArrowLeft', direction: 'source' },
    right: { key: 'ArrowRight', direction: 'target' },
    up: { key: 'ArrowUp', direction: 'source' },
    down: { key: 'ArrowDown', direction: 'target' },
    exit: { key: 'Escape', direction: 'target' },
    'drill in': { key: 'Enter', direction: 'target' },
    'drill out': { key: 'Backspace', direction: 'source' },
    child: { key: 'Enter', direction: 'target' },
    parent: { key: 'Backspace', direction: 'source' },
    forward: { key: 'BracketRight', direction: 'target' },
    backward: { key: 'BracketLeft', direction: 'source' }
};

// Resolve template tokens in a label string, matching the buildPreview() output in LabelBuilder.svelte.
// Exported so SchemaPanel (and any other site that creates/updates SkeletonNodes) can resolve eagerly.
export function resolveLabel(node: SkeletonNode): string {
    const { semantics, data } = node;

    // Helper: collect all leaf data rows from division (data.values) or dimension (data.divisions)
    const getLeafRows = (): Record<string, unknown>[] => {
        if (data.values && typeof data.values === 'object')
            return Object.values(data.values as Record<string, Record<string, unknown>>);
        if (data.divisions && typeof data.divisions === 'object')
            return Object.values(data.divisions as Record<string, { values?: Record<string, unknown> }>).flatMap(d =>
                Object.values(d.values ?? {})
            ) as Record<string, unknown>[];
        return [];
    };

    // Read from semantics.template (the formatter model); fall back to label for legacy nodes
    let label = semantics.template ?? semantics.label;

    // --- Aggregate tokens (resolve before key/value tokens) ---
    // {count} — leaf count
    label = label.replace(/\{count\}/g, () => {
        if (data.values && typeof data.values === 'object') return String(Object.keys(data.values as object).length);
        if (data.divisions && typeof data.divisions === 'object')
            return String(
                Object.values(data.divisions as Record<string, { values?: object }>).reduce(
                    (sum, d) => sum + Object.keys(d.values ?? {}).length,
                    0
                )
            );
        return '0';
    });

    // {subcount} — division count (dimension nodes only)
    label = label.replace(/\{subcount\}/g, () =>
        data.divisions && typeof data.divisions === 'object'
            ? String(Object.keys(data.divisions as object).length)
            : '0'
    );

    // {min:"f"}, {max:"f"}, {sum:"f"}, {avg:"f"}
    label = label.replace(/\{(min|max|sum|avg):"([^"]+)"\}/g, (_, agg: string, field: string) => {
        const rows = getLeafRows();
        const vals = rows.map(r => Number((r as Record<string, unknown>)[field])).filter(v => !isNaN(v));
        if (vals.length === 0) return '';
        if (agg === 'min') return String(Math.min(...vals));
        if (agg === 'max') return String(Math.max(...vals));
        if (agg === 'sum') return String(vals.reduce((a, b) => a + b, 0));
        if (agg === 'avg') return String(Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)));
        return '';
    });

    // {trend:"x":"y"}, {r2:"x":"y"} — leave as readable placeholders
    label = label.replace(/\{trend:"[^"]+":"[^"]+"\}/g, '[trend]');
    label = label.replace(/\{r2:"[^"]+":"[^"]+"\}/g, '[r²]');

    // --- {key:"f"} tokens ---
    if (semantics.omitKeyNames) {
        label = label.replace(/\{key:"[^"]+"\}:\s*/g, '');
        label = label.replace(/\{key:"[^"]+"\}/g, '');
    } else {
        label = label.replace(/\{key:"([^"]+)"\}/g, (_, f: string) => f);
    }

    // --- {value:"f"} tokens ---
    label = label.replace(/\{value:"([^"]+)"\}/g, (_, f: string) => {
        // Numerical division range: compute from numericalExtents
        if (f === 'range' && Array.isArray(data.numericalExtents) && data.numericalExtents.length === 2) {
            return `${data.numericalExtents[0]}–${data.numericalExtents[1]}`;
        }
        // Dimension node: data[f] may be undefined when f IS the dimension key name
        if (data[f] === undefined && data.dimensionKey === f) return f;
        return String(data[f] ?? '');
    });

    label = label.trim().replace(/[.,\s]+$/, '');

    // --- Name suffix (match preview: "Base Name." or "Name.") ---
    if (semantics.name) {
        const capName = semantics.name.charAt(0).toUpperCase() + semantics.name.slice(1);
        label = label ? `${label} ${capName}.` : `${capName}.`;
    }

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
        // semantics.label is already the resolved string (set eagerly in SchemaPanel/PropertiesPanel)
        const label = skNode.semantics.label || skNode.label || id;

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
