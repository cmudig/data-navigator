export type SkeletonNode = {
    id: string; // crypto.randomUUID()
    label: string;
    source?: 'schema' | 'manual' | 'scaffold'; // origin: 'schema' = DN-derived, 'manual' = user-drawn, 'scaffold' = scaffold-generated
    dnLevel?: 0 | 1 | 2 | 3; // DN hierarchy level (set on schema-generated nodes)
    dimensionKey?: string; // the dimension field key for level1/level2 nodes (used to route labelConfig edits)
    renderId?: string; // DN's rendering ID — links to DOM element; defaults to id if unset
    renderingStrategy?: 'convexHull' | 'unionOfAll' | 'boundingRect' | 'outlineEach' | 'singleSquare' | 'custom'; // DN renderingStrategy
    x: number; // pixels in image coordinate space (top-left)
    y: number;
    width: number;
    height: number;
    isEntry: boolean;
    isCluster: boolean;
    clusterCount?: number;
    // Path shape fields — used when renderProperties.shape === 'path'.
    // pathData accepts any SVG path d string. pathBounds provides fallback geometry for
    // hit-testing and editor interactions. Built with extensibility in mind: future versions
    // will support path segment editing, arc/curve templates, and group-to-path generation.
    pathData?: string;
    pathBounds?: { x: number; y: number; width: number; height: number };
    semantics: {
        label: string; // resolved display string — single source of truth for the final label
        template: string; // formatter model string; supports {key:"f"}/{value:"f"} and aggregate tokens
        name: string; // noun appended after label, e.g. "data point", "node"
        includeParentName: boolean; // append "in [parent]" to output
        includeIndex: boolean; // append "X of Y" to output
        omitKeyNames: boolean; // suppress {key:"..."} tokens in resolved output
        includeDimensionName?: boolean; // level2 only: append "in {dimKey}" to label suffix
        includeParentNames?: string[]; // level3 only: dimension keys whose name to append to suffix
        includeParentDivisions?: string[]; // level3 only: dimension keys whose subgroup position to append
    };
    data: Record<string, unknown>; // maps to DN's node.data
    renderProperties: {
        shape: 'rect' | 'ellipse' | 'path';
        fillEnabled: boolean;
        fill: string;
        opacity: number;
        strokeWidth: number;
        strokeColor: string;
        strokeDash: 'solid' | 'dashed' | 'dotted';
        ariaRole: string;
        customClass: string;
    };
};

/**
 * Represents a single navigable relationship between two nodes.
 *
 * ## DN edge model — one edge, always two nav rules
 *
 * Every edge in the DN library carries exactly two `navigationRuleNames`
 * (forward + backward). Directionality is NOT determined by the number of
 * rules on the edge — it is determined at the NODE level: `addEdgeToNode()`
 * in the DN library controls which nodes hold the edge in their edge list.
 *
 * **Drill (parent → child / child → parent):**
 *   - `navigationRuleNames: ['drill in', 'drill out']`
 *   - Dimension node holds only the edge to its FIRST division (via `addEdgeToNode`).
 *   - Each non-first division holds its own parent edge as TARGET only.
 *   - Visually rendered as a single straight arrow (source → target).
 *
 * **Sibling (within-dimension navigation):**
 *   - `navigationRuleNames: ['forward', 'backward']` (or left/right)
 *   - Both endpoints hold the same edge ID.
 *   - Visually rendered as two curved arrows (one per direction) within one `<g>`.
 *   - `addEdgeBetween()` in GraphCanvas creates this when "Add pairs" is enabled.
 *
 * **Navigation structure for testing:**
 * The testing page reads `appState.dnStructure` directly (raw DN result from
 * SchemaPanel) rather than reconstructing via `toStructure()`. This preserves
 * the correct per-node edge membership that the DN library sets — information
 * that is not stored on `SkeletonEdge` and cannot be reconstructed from
 * source/target alone. `toStructure()` is a fallback for purely manual graphs.
 */
export type SkeletonEdge = {
    id: string;
    sourceId: string;
    targetId: string;
    direction: 'up' | 'down' | 'left' | 'right' | 'exit' | 'custom';
    label: string;
    dnProperties: Record<string, unknown>;
    navigationRuleNames?: string[]; // DN nav rule names (always 2: forward + backward)
};
