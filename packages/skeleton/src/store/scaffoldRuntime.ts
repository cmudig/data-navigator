/**
 * Ephemeral scaffold runtime state.
 *
 * NOT persisted, NOT reactive. ScaffoldOverlay writes here after each Vega
 * render; ScaffoldPanel reads here when the user clicks Commit or Extract.
 *
 * Using plain module-level variables (not a Svelte store) keeps the Vega View
 * object out of Svelte's reactive proxy system, which would break it.
 */
import type { ExtractedMark } from '../utils/scaffoldAdapter';
import type { View } from 'vega';

export let latestMarks: ExtractedMark[] = [];
export let latestView: View | null = null;

export function setScaffoldMarks(marks: ExtractedMark[]): void {
    latestMarks = marks;
}

export function setScaffoldView(view: View | null): void {
    latestView = view;
}
