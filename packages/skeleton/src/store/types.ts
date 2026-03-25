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
        label: string; // maps to DN's node.semantics.label; supports {key:"f"}/{value:"f"} templates
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

export type SkeletonEdge = {
    id: string;
    sourceId: string;
    targetId: string;
    direction: 'up' | 'down' | 'left' | 'right' | 'exit' | 'custom';
    label: string;
    dnProperties: Record<string, unknown>;
    navigationRuleNames?: string[]; // DN nav rule names this edge carries (e.g. ['left', 'right'])
};
