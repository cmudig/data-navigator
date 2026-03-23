import type { VariableMeta } from '../../../store/appState';

type Row = Record<string, unknown>;

// Returns a map of variable key → { note, primary } where:
//   primary = true  → highlight as "Suggested"
//   primary = false → show as optional/informational note only
export function computeDimensionSuggestion(
    chartType: string,
    variables: VariableMeta[],
    data: Row[] | null,
): Record<string, { note: string; primary: boolean }> | null {
    const rowCount = data?.length ?? 0;

    const uniqueCount = (key: string): number =>
        new Set((data ?? []).map(r => r[key]).filter(x => x != null).map(String)).size;

    // Categorical candidates: not removed, has 2+ distinct values
    const catVars = variables
        .filter(v => !v.removed && v.type === 'categorical')
        .map(v => ({ key: v.key, u: rowCount > 0 ? uniqueCount(v.key) : 2 }))
        .filter(({ u }) => u > 1)
        .sort((a, b) => a.u - b.u); // fewer unique = more group-like (better for navigation)

    const numVars = variables
        .filter(v => !v.removed && !v.isId && v.type === 'numerical')
        .map(v => ({ key: v.key, u: uniqueCount(v.key) }));

    const result: Record<string, { note: string; primary: boolean }> = {};

    switch (chartType) {
        case 'bar': {
            if (catVars.length === 0) return null;
            result[catVars[0].key] = { note: 'Suggested — often used for axis grouping or possibly (optionally) for color', primary: true };
            if (catVars.length >= 2) {
                result[catVars[1].key] = { note: 'Optional — often used for axis grouping or possibly (optionally) for color', primary: false };
            }
            return result;
        }
        case 'stacked-bar':
        case 'clustered-bar': {
            if (catVars.length === 0) return null;
            result[catVars[0].key] = { note: 'Suggested — often used for axis categories or stack/cluster groupings', primary: true };
            if (catVars.length >= 2) {
                result[catVars[1].key] = { note: 'Suggested — often used for axis categories or stack/cluster groupings', primary: true };
            }
            return result;
        }
        case 'line':
        case 'area': {
            if (catVars.length === 0) return null;
            result[catVars[0].key] = { note: 'Suggested — often used for intervals, time, or series grouping', primary: true };
            if (catVars.length >= 2) {
                result[catVars[1].key] = { note: 'Suggested — often used for intervals, time, or series grouping', primary: true };
            }
            return result;
        }
        case 'scatter': {
            if (numVars.length < 2) return null;
            result[numVars[0].key] = { note: 'Suggested — often used for axis', primary: true };
            result[numVars[1].key] = { note: 'Suggested — often used for axis', primary: true };
            if (catVars.length >= 1) {
                result[catVars[0].key] = { note: 'Optional — add if points are color-coded or grouped', primary: false };
            }
            return result;
        }
        case 'pie':
        case 'donut': {
            if (catVars.length === 0) return null;
            result[catVars[0].key] = { note: 'Suggested — often used to define each slice', primary: true };
            return result;
        }
        case 'heatmap': {
            if (catVars.length < 2) return null;
            result[catVars[0].key] = { note: 'Suggested — often used for row/column axis', primary: true };
            result[catVars[1].key] = { note: 'Suggested — often used for row/column axis', primary: true };
            return result;
        }
        case 'treemap': {
            if (catVars.length === 0) return null;
            result[catVars[0].key] = { note: 'Suggested — often used for nesting', primary: true };
            if (catVars.length >= 2) {
                result[catVars[1].key] = { note: 'Suggested — often used for nesting', primary: true };
            }
            return result;
        }
        case 'network': {
            if (catVars.length === 0) return null;
            result[catVars[0].key] = { note: 'Suggested — often used for grouping', primary: true };
            if (catVars.length >= 2) {
                result[catVars[1].key] = { note: 'Optional — often used for grouping', primary: false };
            }
            return result;
        }
        case 'map': {
            if (catVars.length === 0) return null;
            result[catVars[0].key] = { note: 'Suggested — often used for geographic/regional identifier', primary: true };
            return result;
        }
        default:
            return null;
    }
}
