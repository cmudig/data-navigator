import { writable } from 'svelte/store';
import type { SkeletonNode, SkeletonEdge } from './types';

export type { SkeletonNode, SkeletonEdge };

export interface UploadedDataRaw {
    filename: string;
    content: string;
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
    entryNodeId: null
};

export const appState = writable<AppState>({ ...DEFAULT_APP_STATE });
