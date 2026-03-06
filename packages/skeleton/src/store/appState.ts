import { writable } from 'svelte/store';

export interface AppState {
    currentStep: number; // 0–6
}

export const appState = writable<AppState>({
    currentStep: 0
});
