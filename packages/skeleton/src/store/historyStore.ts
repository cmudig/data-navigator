import { writable, derived, get } from 'svelte/store';
import { appState } from './appState';
import { serializeAppState, applySerializedState } from '../utils/saveLoad';
import type { SerializedState } from '../utils/saveLoad';

const MAX_HISTORY = 20;

export interface HistoryEntry {
    label: string;
    timestamp: number;
    snapshot: SerializedState; // same format as save files — single source of truth
    imageDataUrl: string | null; // kept separate; not in SerializedState
}

interface HistoryState {
    entries: HistoryEntry[];
    pointer: number; // -1 when empty
}

export const historyStore = writable<HistoryState>({ entries: [], pointer: -1 });

export function logAction(label: string): void {
    const s = get(appState);
    const entry: HistoryEntry = {
        label,
        timestamp: Date.now(),
        snapshot: serializeAppState(s),
        imageDataUrl: s.imageDataUrl
    };
    historyStore.update(h => {
        const base = h.pointer >= 0 ? h.entries.slice(0, h.pointer + 1) : [];
        const newEntries = [...base, entry];
        const trimmed =
            newEntries.length > MAX_HISTORY ? newEntries.slice(newEntries.length - MAX_HISTORY) : newEntries;
        return { entries: trimmed, pointer: trimmed.length - 1 };
    });
}

// Debounced variant for high-frequency mutations (e.g. text input fields).
// Only the final state after the delay is captured.
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function logActionDebounced(label: string, delay = 400): void {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
        logAction(label);
        _debounceTimer = null;
    }, delay);
}

function restoreEntry(entry: HistoryEntry): void {
    applySerializedState(entry.snapshot, entry.imageDataUrl);
}

export function undo(): void {
    const h = get(historyStore);
    if (h.pointer <= 0) return;
    const newPointer = h.pointer - 1;
    restoreEntry(h.entries[newPointer]);
    historyStore.update(s => ({ ...s, pointer: newPointer }));
}

export function redo(): void {
    const h = get(historyStore);
    if (h.pointer >= h.entries.length - 1) return;
    const newPointer = h.pointer + 1;
    restoreEntry(h.entries[newPointer]);
    historyStore.update(s => ({ ...s, pointer: newPointer }));
}

export function jumpTo(index: number): void {
    const h = get(historyStore);
    if (index < 0 || index >= h.entries.length) return;
    restoreEntry(h.entries[index]);
    historyStore.update(s => ({ ...s, pointer: index }));
}

export function resetHistory(): void {
    historyStore.set({ entries: [], pointer: -1 });
}

export const canUndo = derived(historyStore, h => h.pointer > 0);
export const canRedo = derived(historyStore, h => h.pointer < h.entries.length - 1);
