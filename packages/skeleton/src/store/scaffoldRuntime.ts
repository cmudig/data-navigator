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

// ── Auto padding-estimation guards ──────────────────────────────────────────
// These coordinate the one-shot CV-based padding estimator without entering the
// Svelte reactive proxy (which would make them trigger effects → render loops).
//
//  - autoPaddingHasRun:  flips true the first time the estimator fires for the
//                        current scaffold session, so it never auto-runs twice.
//                        Reset when scaffold mode exits (ScaffoldOverlay.onDestroy).
//  - paddingEstimateInFlight: re-entrancy guard while the async estimate awaits
//                        detection, so intermediate renders don't re-trigger it.
//  - pendingPaddingVerification: one-shot hand-off. runEstimateAndApply sets the
//                        detected target positions here, then patches padding; the
//                        NEXT render consumes and clears it to log the residual.

/** Detected target positions (image px) used to verify a padding solve after re-render. */
export interface PaddingVerificationTargets {
    x: { detLo: number; detHi: number } | null;
    y: { detLo: number; detHi: number } | null;
}

export let autoPaddingHasRun = false;
export function setAutoPaddingHasRun(v: boolean): void {
    autoPaddingHasRun = v;
}

export let paddingEstimateInFlight = false;
export function setPaddingEstimateInFlight(v: boolean): void {
    paddingEstimateInFlight = v;
}

export let pendingPaddingVerification: PaddingVerificationTargets | null = null;
export function setPendingPaddingVerification(v: PaddingVerificationTargets | null): void {
    pendingPaddingVerification = v;
}
