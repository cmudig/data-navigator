import { writable } from 'svelte/store';
import type { SkeletonNode, SkeletonEdge } from './types';

export type { SkeletonNode, SkeletonEdge };

export interface DivisionEntry {
    id: string; // editable — used as DN division ID
    originalValue: string; // original data value or range label (read-only display)
}

export interface DimensionSchema {
    key: string;
    type: 'numerical' | 'categorical';
    included: boolean;
    navIndex: number | null; // 0/1/2 when selected
    // Behavior
    extents: 'circular' | 'terminal' | 'bridgedCousins';
    compressSparseDivisions: boolean;
    sortMethod: 'ascending' | 'descending' | 'none';
    subdivisions: number; // numerical only, 1–12, default 4
    // Computed divisions (editable IDs)
    divisions: DivisionEntry[];
    // Sibling nav (forward/backward within dimension)
    forwardName: string;
    forwardKey: string;
    backwardName: string;
    backwardKey: string;
    // Drill nav (parent/child between levels)
    drillInName: string;
    drillInKey: string;
    drillOutName: string;
    drillOutKey: string;
}

export interface SchemaState {
    dimensions: DimensionSchema[];
    childmostNavigation: 'within' | 'across';
    allowMoreThan3: boolean;
    collapsed: boolean;
    graphMode: 'tree' | 'force';
    hideLeafNodes: boolean; // graph only — hides data rows from graph preview
    // Level 0 (optional root entry node)
    level0Enabled: boolean;
    level0Id: string;
    // Level 1 options (navigation between dimension nodes, via parentOptions.level1Options)
    level1Extents: 'circular' | 'terminal';
    level1NavForwardName: string;
    level1NavForwardKey: string;
    level1NavBackwardName: string;
    level1NavBackwardKey: string;
}

export interface UploadedDataRaw {
    filename: string;
    content: string;
}

export interface InputConfig {
    enableKeyboard: boolean; // default: true
    enableSwitch: boolean; // default: false
    enableTextInput: boolean; // default: false
}

export interface RenderConfig {
    positionUnit: 'px' | '%';
    showOverlay: boolean;
    semanticNames: string[]; // user-defined name options for the name dropdown
}

export interface AppState {
    currentStep: number; // 0–6
    // Step 0 — Upload
    imageDataUrl: string | null;
    imageWidth: number | null;
    imageHeight: number | null;
    uploadedData: Record<string, unknown>[] | null;
    uploadedDataRaw: UploadedDataRaw | null;
    // Step 1 — Structure
    nodes: Map<string, SkeletonNode>;
    edges: Map<string, SkeletonEdge>;
    selectedNodeIds: Set<string>;
    selectedEdgeIds: Set<string>;
    entryNodeId: string | null;
    hoveredNodeId: string | null; // linked hover between schema and canvas
    hoveredEdgeId: string | null;
    // Step 1 — Schema (data-driven structure)
    schemaState: SchemaState;
    // Step 2 — Input
    inputConfig: InputConfig;
    // Step 3 — Render
    renderConfig: RenderConfig;
}

export const DEFAULT_APP_STATE: AppState = {
    currentStep: 0,
    imageDataUrl: null,
    imageWidth: null,
    imageHeight: null,
    uploadedData: null,
    uploadedDataRaw: null,
    nodes: new Map<string, SkeletonNode>(),
    edges: new Map<string, SkeletonEdge>(),
    selectedNodeIds: new Set<string>(),
    selectedEdgeIds: new Set<string>(),
    entryNodeId: null,
    hoveredNodeId: null,
    hoveredEdgeId: null,
    schemaState: {
        dimensions: [],
        childmostNavigation: 'within',
        allowMoreThan3: false,
        collapsed: false,
        graphMode: 'tree',
        hideLeafNodes: false,
        level0Enabled: false,
        level0Id: 'root',
        level1Extents: 'terminal',
        level1NavForwardName: 'left',
        level1NavForwardKey: 'ArrowLeft',
        level1NavBackwardName: 'right',
        level1NavBackwardKey: 'ArrowRight'
    },
    inputConfig: {
        enableKeyboard: true,
        enableSwitch: false,
        enableTextInput: false
    },
    renderConfig: {
        positionUnit: 'px',
        showOverlay: false,
        semanticNames: ['data point', 'node']
    }
};

export const appState = writable<AppState>({ ...DEFAULT_APP_STATE });
