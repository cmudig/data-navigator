import type { StructureOptions } from 'data-navigator';
import type { BokehChartType, BokehWrapperOptions } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveEl(ref: string | HTMLElement): HTMLElement | null {
    if (typeof ref === 'string') return document.getElementById(ref);
    return ref instanceof HTMLElement ? ref : null;
}

function isNumericField(data: Record<string, unknown>[], field: string): boolean {
    return data.some(d => d[field] != null && !isNaN(Number(d[field])));
}

function hasMultiplePerX(data: Record<string, unknown>[], xField: string): boolean {
    const counts = new Map<unknown, number>();
    for (const d of data) {
        const v = d[xField];
        counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return Array.from(counts.values()).some(c => c > 1);
}

// ─── Chart type detection ────────────────────────────────────────────────────

export function resolveChartType(
    type: BokehChartType | undefined,
    data: Record<string, unknown>[],
    xField?: string,
    yField?: string,
    groupField?: string
): BokehChartType {
    if (type && type !== 'auto') return type;

    if (!data.length) return 'bar';

    if (groupField && xField && yField) {
        return hasMultiplePerX(data, xField) ? 'stacked_bar' : 'multiline';
    }

    if (xField && yField) {
        if (isNumericField(data, xField) && isNumericField(data, yField)) return 'scatter';
        if (!isNumericField(data, xField)) return 'bar';
        return 'line';
    }

    if (xField) {
        return isNumericField(data, xField) ? 'line' : 'bar';
    }

    return 'bar';
}

// ─── Structure builders ──────────────────────────────────────────────────────

const exitEdge = {
    edgeId: 'dn-exit',
    edge: {
        source: (_d: unknown, c: string) => c,
        target: () => '',
        navigationRules: ['exit']
    }
};

const baseNavRules = {
    left: { key: 'ArrowLeft', direction: 'source' as const },
    right: { key: 'ArrowRight', direction: 'target' as const },
    child: { key: 'Enter', direction: 'target' as const },
    parent: { key: 'Backspace', direction: 'source' as const },
    exit: { key: 'Escape', direction: 'target' as const }
};

/** Flat circular list: left ↔ right through sorted items. */
function buildFlatStructure(
    data: Record<string, unknown>[],
    xField: string | undefined,
    idField: string | undefined
): Omit<StructureOptions, 'data'> & { data: Record<string, unknown>[] } {
    // Sort by xField if present
    const sorted = xField
        ? [...data].sort((a, b) => {
              const av = a[xField];
              const bv = b[xField];
              if (typeof av === 'number' && typeof bv === 'number') return av - bv;
              return String(av) < String(bv) ? -1 : 1;
          })
        : [...data];

    const ids: string[] = sorted.map((d, i) =>
        idField && d[idField] != null ? String(d[idField]) : `dn-item-${i}`
    );

    const augmented = sorted.map((d, i) => ({ ...d, _dnId: ids[i] }));

    return {
        data: augmented,
        idKey: '_dnId',
        navigationRules: baseNavRules,
        genericEdges: [
            {
                edgeId: 'dn-right',
                edge: {
                    source: (_d: unknown, c: string) => c,
                    target: (_d: unknown, c: string) => {
                        const i = ids.indexOf(c);
                        return ids[(i + 1) % ids.length];
                    },
                    navigationRules: ['right']
                }
            },
            {
                edgeId: 'dn-left',
                edge: {
                    source: (_d: unknown, c: string) => {
                        const i = ids.indexOf(c);
                        return ids[(i - 1 + ids.length) % ids.length];
                    },
                    target: (_d: unknown, c: string) => c,
                    navigationRules: ['left']
                }
            },
            exitEdge
        ]
    };
}

/** Categorical dimension: enter → left/right through x-groups → child data points. */
function buildDimensionStructure(
    data: Record<string, unknown>[],
    dimensionKey: string,
    idField: string | undefined,
    compositeKey?: string
): Omit<StructureOptions, 'data'> & { data: Record<string, unknown>[] } {
    let idKey: StructureOptions['idKey'];

    if (compositeKey) {
        idKey = (d?: Record<string, unknown>) =>
            d ? `${String(d[dimensionKey])}-${String(d[compositeKey])}` : '';
    } else if (idField) {
        idKey = idField;
    } else {
        idKey = dimensionKey;
    }

    return {
        data,
        idKey,
        navigationRules: baseNavRules,
        dimensions: {
            values: [
                {
                    dimensionKey,
                    type: 'categorical' as const,
                    behavior: { extents: 'circular' as const }
                }
            ]
        },
        genericEdges: [exitEdge]
    };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Builds the StructureOptions that will be passed to data-navigator's
 * `structure()` function, based on the wrapper options.
 */
export function buildStructureOptions(
    options: BokehWrapperOptions
): Omit<StructureOptions, 'data'> & { data: Record<string, unknown>[] } {
    const { data, type, xField, yField, groupField, idField, structureOptions = {} } = options;
    const chartType = resolveChartType(type, data, xField, yField, groupField);

    let base: Omit<StructureOptions, 'data'> & { data: Record<string, unknown>[] };

    switch (chartType) {
        case 'scatter':
        case 'line':
            base = buildFlatStructure(data, xField, idField);
            break;

        case 'bar':
        case 'hbar': {
            const catField =
                xField ||
                Object.keys(data[0] ?? {}).find(k => !isNumericField(data, k)) ||
                'x';
            base = buildDimensionStructure(data, catField, idField);
            break;
        }

        case 'stacked_bar': {
            const stackX = xField || 'x';
            const stackGroup = groupField || 'group';
            base = buildDimensionStructure(data, stackX, idField, stackGroup);
            break;
        }

        case 'multiline': {
            const lineGroup = groupField || 'series';
            base = buildDimensionStructure(data, lineGroup, idField, xField);
            break;
        }

        default:
            base = buildFlatStructure(data, xField, idField);
    }

    // Shallow-merge user overrides (structureOptions wins on conflict)
    return { ...base, ...structureOptions } as typeof base;
}

/**
 * Generates human-readable command labels for the text-chat interface
 * based on chart type and field names.
 */
export function buildCommandLabels(options: BokehWrapperOptions): Record<string, string> {
    const { data, type, xField, yField, groupField, commandLabels = {} } = options;
    const chartType = resolveChartType(type, data, xField, yField, groupField);

    const auto: Record<string, string> = {};

    switch (chartType) {
        case 'bar':
        case 'hbar':
            auto.left = `Previous ${xField ?? 'category'}`;
            auto.right = `Next ${xField ?? 'category'}`;
            auto.child = `See ${xField ?? 'category'} detail`;
            auto.parent = 'Go back up';
            break;

        case 'scatter':
        case 'line':
            auto.left = `Previous ${xField ?? 'point'}`;
            auto.right = `Next ${xField ?? 'point'}`;
            break;

        case 'stacked_bar':
            auto.left = `Previous ${xField ?? 'category'}`;
            auto.right = `Next ${xField ?? 'category'}`;
            auto.child = `See ${groupField ?? 'stack'} breakdown`;
            auto.parent = 'Go back up';
            break;

        case 'multiline':
            auto.left = `Previous ${groupField ?? 'series'}`;
            auto.right = `Next ${groupField ?? 'series'}`;
            auto.child = `Explore ${xField ?? 'data points'} in series`;
            auto.parent = 'Go back up';
            break;
    }

    // commandLabels from user wins
    return { ...auto, ...commandLabels };
}

export { resolveEl };
