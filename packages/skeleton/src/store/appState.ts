import { writable } from 'svelte/store';
import type { SkeletonNode, SkeletonEdge } from './types';

export type { SkeletonNode, SkeletonEdge };

export interface DimensionSchema {
    key: string;
    type: 'numerical' | 'categorical';
    included: boolean;
    navIndex: number | null; // 0/1/2 when selected
    compressSparseDivisions: boolean;
    // Sibling nav (forward/backward within division)
    forwardName: string;
    forwardKey: string;
    backwardName: string;
    backwardKey: string;
    // Drill nav (parent/child between levels)
    drillInName: string;
    drillInKey: string;
    drillUpName: string;
    drillUpKey: string;
}

export interface SchemaState {
    dimensions: DimensionSchema[];
    childmostNavigation: 'within' | 'across';
    allowMoreThan3: boolean;
    collapsed: boolean;
    graphMode: 'tree' | 'force';
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
    schemaState: {
        dimensions: [],
        childmostNavigation: 'within',
        allowMoreThan3: false,
        collapsed: false,
        graphMode: 'tree'
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
