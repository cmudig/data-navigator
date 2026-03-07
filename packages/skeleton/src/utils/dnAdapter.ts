import type { AppState } from '../store/appState';

/*
 * Data Navigator v2.4.0 structure shape:
 *
 * {
 *   nodes: {
 *     [nodeId]: {
 *       id: string,
 *       data: Record<string, unknown>,
 *       edges: string[],           // ARRAY of edge IDs (not a direction map)
 *       renderId: string,          // required by rendering module; usually = id
 *       semantics: { label: string }, // what screen readers announce
 *       spatialProperties: { x, y, width, height }  // pixels
 *     }
 *   },
 *   edges: {
 *     [edgeId]: {
 *       source: string,   // source node id
 *       target: string,   // target node id
 *       // direction/command fields — consult packages/data-navigator/src/types.ts
 *     }
 *   }
 * }
 *
 * IMPORTANT: Before implementing toStructure(), read packages/data-navigator/src/types.ts
 * for the authoritative v2.4.0 type definitions. In particular, verify the exact
 * shape of the edge object's navigation/command fields.
 */

export type DNStructure = Record<string, unknown>;

export interface ValidationError {
    field: string;
    message: string;
}

export function toStructure(_state: AppState): DNStructure | null {
    return null;
}

export function validateStructure(_state: AppState): ValidationError[] {
    return [];
}
