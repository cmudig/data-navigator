import { writable } from 'svelte/store';

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
    // Step 1 — Structure (populated later)
    nodes: Record<string, unknown>;
    edges: Record<string, unknown>;
}

export const DEFAULT_APP_STATE: AppState = {
    currentStep: 0,
    imageDataUrl: null,
    imageWidth: null,
    imageHeight: null,
    uploadedData: null,
    uploadedDataRaw: null,
    nodes: {},
    edges: {}
};

export const appState = writable<AppState>({ ...DEFAULT_APP_STATE });
