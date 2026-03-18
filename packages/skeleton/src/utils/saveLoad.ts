/**
 * Save / Load — Skeleton project state persistence.
 *
 * Format: a ZIP archive containing:
 *   skeleton-state.json  — all serializable app state (versioned, extensible)
 *   image.<ext>          — the original image file in its native binary format
 *                          (present only when an image was loaded)
 *
 * The JSON intentionally omits imageDataUrl; the image is stored as a binary
 * file inside the ZIP so the JSON stays human-readable and the image is not
 * inflated by base64 encoding.
 */

import { strToU8, strFromU8, zipSync, unzipSync } from 'fflate';
import { get } from 'svelte/store';
import { appState, DEFAULT_APP_STATE } from '../store/appState';
import type { AppState, SkeletonNode, SkeletonEdge } from '../store/appState';

// ── Save-file format ──────────────────────────────────────────────────────────

const SAVE_FORMAT_VERSION = '1';

/**
 * Serialized state written into skeleton-state.json.
 * Extend this interface (add new optional fields) for future features —
 * old save files simply won't have those fields and callers should
 * fall back to defaults via DEFAULT_APP_STATE.
 */
interface SerializedState {
    currentStep: number;
    imageWidth: number | null;
    imageHeight: number | null;
    uploadedData: Record<string, unknown>[] | null;
    uploadedDataRaw: { filename: string; content: string } | null;
    nodes: [string, SkeletonNode][];
    edges: [string, SkeletonEdge][];
    entryNodeId: string | null;
    schemaState: AppState['schemaState'];
    inputConfig: AppState['inputConfig'];
    renderConfig: AppState['renderConfig'];
    // future fields go here (all optional so old saves remain loadable)
}

interface SaveFile {
    version: string;
    savedAt: string; // ISO 8601
    state: SerializedState;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    // Process in chunks to avoid call-stack overflow on large images
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function imageExtensionFromDataUrl(dataUrl: string): string {
    const m = dataUrl.match(/^data:image\/(\w+);base64,/);
    return m ? m[1] : 'png';
}

function mimeTypeFromExtension(ext: string): string {
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'svg') return 'image/svg+xml';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'webp') return 'image/webp';
    return `image/${ext}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Serialize the current appState to a ZIP archive and trigger a browser
 * download. Synchronous (uses fflate zipSync).
 */
export function saveState(): void {
    const s = get(appState);

    const serialized: SerializedState = {
        currentStep: s.currentStep,
        imageWidth: s.imageWidth,
        imageHeight: s.imageHeight,
        uploadedData: s.uploadedData,
        uploadedDataRaw: s.uploadedDataRaw,
        nodes: Array.from(s.nodes.entries()),
        edges: Array.from(s.edges.entries()),
        entryNodeId: s.entryNodeId,
        schemaState: s.schemaState,
        inputConfig: s.inputConfig,
        renderConfig: s.renderConfig
    };

    const saveFile: SaveFile = {
        version: SAVE_FORMAT_VERSION,
        savedAt: new Date().toISOString(),
        state: serialized
    };

    const files: Record<string, Uint8Array> = {
        'skeleton-state.json': strToU8(JSON.stringify(saveFile, null, 2))
    };

    if (s.imageDataUrl) {
        const ext = imageExtensionFromDataUrl(s.imageDataUrl);
        const base64 = s.imageDataUrl.split(',')[1];
        files[`image.${ext}`] = base64ToUint8Array(base64);
    }

    const zipped = zipSync(files, { level: 6 });
    const blob = new Blob([zipped], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);

    const datePart = new Date().toISOString().slice(0, 10);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `skeleton-${datePart}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
}

/**
 * Load a skeleton ZIP file (produced by saveState) and restore appState.
 * Returns a summary string on success, or throws an Error on failure.
 */
export async function loadState(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(buffer));

    const jsonBytes = unzipped['skeleton-state.json'];
    if (!jsonBytes) {
        throw new Error('Not a Skeleton save file (missing skeleton-state.json).');
    }

    const saveFile: SaveFile = JSON.parse(strFromU8(jsonBytes));
    if (!saveFile.version || !saveFile.state) {
        throw new Error('Unrecognized save file format.');
    }

    const ss = saveFile.state;

    // Reconstruct imageDataUrl from the binary image entry (if present)
    let imageDataUrl: string | null = null;
    for (const name of Object.keys(unzipped)) {
        if (name.startsWith('image.')) {
            const ext = name.slice(name.lastIndexOf('.') + 1);
            const base64 = uint8ArrayToBase64(unzipped[name]);
            imageDataUrl = `data:${mimeTypeFromExtension(ext)};base64,${base64}`;
            break;
        }
    }

    const nodes = new Map<string, SkeletonNode>(ss.nodes);
    const edges = new Map<string, SkeletonEdge>(ss.edges);

    // Merge with DEFAULT_APP_STATE so that fields added in future versions
    // of the schema receive sensible defaults when loading an older file.
    appState.set({
        ...DEFAULT_APP_STATE,
        currentStep: ss.currentStep ?? 0,
        imageDataUrl,
        imageWidth: ss.imageWidth ?? null,
        imageHeight: ss.imageHeight ?? null,
        uploadedData: ss.uploadedData ?? null,
        uploadedDataRaw: ss.uploadedDataRaw ?? null,
        nodes,
        edges,
        selectedNodeIds: new Set(),
        selectedEdgeIds: new Set(),
        entryNodeId: ss.entryNodeId ?? null,
        hoveredNodeId: null,
        hoveredEdgeId: null,
        schemaState: { ...DEFAULT_APP_STATE.schemaState, ...ss.schemaState },
        inputConfig: { ...DEFAULT_APP_STATE.inputConfig, ...ss.inputConfig },
        renderConfig: { ...DEFAULT_APP_STATE.renderConfig, ...ss.renderConfig }
    });

    const nodeCt = nodes.size;
    const edgeCt = edges.size;
    return `Loaded: ${nodeCt} node${nodeCt !== 1 ? 's' : ''}, ${edgeCt} edge${edgeCt !== 1 ? 's' : ''} (saved ${saveFile.savedAt.slice(0, 10)}).`;
}
