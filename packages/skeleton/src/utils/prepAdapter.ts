import type { PrepState, SchemaState } from '../store/appState';

/**
 * Final-sync: re-derive key schemaState fields from saved Q/A answers.
 *
 * Called once at step transition (Prep → Editor). Most schemaState fields are
 * already correct — they are written incrementally by QAEngine's schemaPatch
 * callbacks per question. This function is a safety-net reconciliation: if a
 * user re-answered Chapter 1 without re-running later chapters, this ensures
 * level0Enabled and level0Id reflect the canonical Chapter 1 answers.
 *
 * Does NOT touch dimensions, nav keys, extents, childmostNavigation, or
 * level1 settings — those are owned by QAEngine incremental writes.
 */
export function applyPrepToSchema(prep: PrepState, current: SchemaState): SchemaState {
    const ch1 = prep.qaProgress.chapters.find(c => c.id === 'top-level-access')?.answers ?? {};

    const level0Enabled = ch1['root-node'] === 'yes';
    const level0Id = ((ch1['root-label'] as string) || '').trim() || current.level0Id || 'root';

    return {
        ...current,
        level0Enabled,
        level0Id,
        // Copy label templates from prep so SchemaPanel can edit them independently.
        // If the user then edits labels in SchemaPanel, those edits stay in schemaState.labelConfig
        // and do not write back to prepState.
        labelConfig: prep.labelConfig
    };
}
