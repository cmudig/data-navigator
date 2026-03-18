export type SkeletonNode = {
    id: string; // crypto.randomUUID()
    label: string;
    source?: 'schema' | 'manual'; // origin: 'schema' = DN-derived, 'manual' = user-drawn
    x: number; // pixels in image coordinate space (top-left)
    y: number;
    width: number;
    height: number;
    isEntry: boolean;
    isCluster: boolean;
    clusterCount?: number;
    semantics: {
        label: string; // maps to DN's node.semantics.label; supports {key:"f"}/{value:"f"} templates
        name: string; // noun appended after label, e.g. "data point", "node"
        includeParentName: boolean; // append "in [parent]" to output
        includeIndex: boolean; // append "X of Y" to output
    };
    data: Record<string, unknown>; // maps to DN's node.data
    renderProperties: {
        shape: 'rect' | 'ellipse' | 'custom';
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
};
