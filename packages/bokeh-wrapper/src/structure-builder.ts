import type { StructureOptions, Structure } from 'data-navigator';
import type { BokehChartType, BokehWrapperOptions } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function resolveEl(ref: string | HTMLElement): HTMLElement | null {
    if (typeof ref === 'string') return document.getElementById(ref);
    return ref instanceof HTMLElement ? ref : null;
}

/** Make a string safe for use as a node / DOM id. */
function safeId(s: unknown): string {
    return String(s).replace(/\s+/g, '-').replace(/[^\w-]/g, '');
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
        if (isNumericField(data, xField) && isNumericField(data, yField)) return 'cartesian';
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
    // Primary (x-axis) navigation
    left:     { key: 'ArrowLeft',    direction: 'source' },
    right:    { key: 'ArrowRight',   direction: 'target' },
    // Secondary encoding (y-axis / group) navigation
    up:       { key: 'ArrowUp',      direction: 'source' },
    down:     { key: 'ArrowDown',    direction: 'target' },
    // Tertiary encoding navigation  ([  /  ])
    backward: { key: 'BracketLeft',  direction: 'source' },
    forward:  { key: 'BracketRight', direction: 'target' },
    // Hierarchy traversal
    child:    { key: 'Enter',        direction: 'target' },
    parent:   { key: 'Backspace',    direction: 'source' },
    undo:     { key: 'Delete',       direction: 'source' },
    // Encoding-specific parent shortcuts (W = x-axis parent, J = y-axis parent, \ = tertiary parent)
    xParent:  { key: 'KeyW',         direction: 'source' },
    yParent:  { key: 'KeyJ',         direction: 'source' },
    zParent:  { key: 'Backslash',    direction: 'source' },
    // Exit and help
    exit:     { key: 'Escape',       direction: 'target' },
    help:     { key: 'KeyY',         direction: 'target' },
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
        idField && d[idField] != null ? safeId(d[idField]) : `dn-item-${i}`
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

/**
 * Dual-dimension cross-navigable: left/right for xField groups, up/down for groupField groups.
 * At the leaf (childmost) level all four arrow keys remain active so users can freely
 * traverse both axes without drilling back up.
 *
 * Uses addIds:true so data-navigator stamps a unique numeric 'id' onto each datum —
 * required when two dimensions share the same leaf nodes.
 */
function buildCrosslineStructure(
    data: Record<string, unknown>[],
    xField: string,
    groupField: string
): Omit<StructureOptions, 'data'> & { data: Record<string, unknown>[] } {
    return {
        data,
        idKey: 'id',
        addIds: true,
        navigationRules: baseNavRules,
        dimensions: {
            values: [
                {
                    dimensionKey: xField,
                    type: 'categorical' as const,
                    behavior: {
                        extents: 'circular' as const,
                        childmostNavigation: 'across' as const
                    },
                    // left/right siblings at this dimension level; W drills back up
                    navigationRules: {
                        sibling_sibling: ['left', 'right'],
                        parent_child: ['xParent', 'child']
                    }
                },
                {
                    dimensionKey: groupField,
                    type: 'categorical' as const,
                    behavior: {
                        extents: 'circular' as const,
                        childmostNavigation: 'across' as const
                    },
                    // up/down siblings at this dimension level; J drills back up
                    navigationRules: {
                        sibling_sibling: ['up', 'down'],
                        parent_child: ['yParent', 'child']
                    }
                }
            ]
        },
        genericEdges: [exitEdge]
    };
}

/**
 * Two numerical dimensions sharing leaf nodes: left/right for xField, up/down for yField.
 * Each dimension is split into automatic subdivisions (bins) derived from the data range.
 * Extents are terminal so navigation stops at the first/last bin rather than wrapping.
 * At the leaf (deepest) level all four arrow keys stay active for free 2-D roaming.
 */
function buildCartesianStructure(
    data: Record<string, unknown>[],
    xField: string,
    yField: string,
    idField: string | undefined
): Omit<StructureOptions, 'data'> & { data: Record<string, unknown>[] } {
    // Stamp a stable `id` on each datum (required so the numerical subdivision
    // loop in data-navigator's scaffoldDimensions can key division values correctly).
    // We re-use any existing unique identifier the caller designates via idField,
    // falling back to the raw `id` field, then a sequential fallback.
    const augmented = data.map((d, i) => {
        const baseId =
            idField && d[idField] != null
                ? safeId(String(d[idField]))
                : d['id'] != null
                    ? safeId(String(d['id']))
                    : `dn-pt-${i}`;
        return { ...d, id: baseId };
    });

    // Automatic bin count: ceil(sqrt(N)), minimum 3, max 12.
    // createNumericalSubdivisions receives (dimensionKey, sortedValues) at build time.
    const autoSubdivs = (_key: string, values: Record<string, unknown>) =>
        Math.min(12,Math.max(3, Math.ceil(Math.sqrt(Object.keys(values).length))));

    // We want to swap up/down in a scatterplot so that low values (first) go "up" to higher ones
    // (Typically "down" means to move "forward")
    const augNavRules = {...baseNavRules}
    augNavRules.up = { key: 'ArrowUp',      direction: 'target' as const };
    augNavRules.down = { key: 'ArrowDown',    direction: 'source' as const };
    return {
        data: augmented,
        idKey: 'id',
        navigationRules: augNavRules,
        dimensions: {
            values: [
                {
                    dimensionKey: xField,
                    type: 'numerical' as const,
                    behavior: {
                        extents: 'terminal' as const
                    },
                    operations: { createNumericalSubdivisions: autoSubdivs },
                    navigationRules: {
                        sibling_sibling: ['left', 'right'],
                        parent_child: ['xParent', 'child']
                    }
                },
                {
                    dimensionKey: yField,
                    type: 'numerical' as const,
                    behavior: {
                        extents: 'terminal' as const
                    },
                    operations: { 
                        createNumericalSubdivisions: autoSubdivs
                        // sortFunction: (a:any,b:any) => {
                        //     console.log("sorting dim",yField,a,b)
                        //     return b[yField] - a[yField]
                        // }
                    },
                    // divisionOptions: {
                    //     sortFunction: (a:any,b:any) => {
                    //         console.log("sorting div",yField,a,b)
                    //         return b[yField] - a[yField]
                    //     }
                    // },
                    navigationRules: {
                        sibling_sibling: ['down', 'up'],
                        parent_child: ['yParent', 'child']
                    }
                }
            ]
        },
        genericEdges: [exitEdge]
    };
}

/** Categorical dimension: enter → left/right through x-groups → child data points. */
function buildDimensionStructure(
    data: Record<string, unknown>[],
    dimensionKey: string,
    idField: string | undefined,
    compositeKey?: string,
    compressSparseDivisions?: boolean
): Omit<StructureOptions, 'data'> & { data: Record<string, unknown>[] } {
    let idKey: StructureOptions['idKey'];
    let augmented = data;

    if (compositeKey) {
        // Pre-stamp a composite ID onto each datum so data-navigator's buildNodes
        // can look it up as d[idKey] with a plain string key.
        // (data-navigator always does d[idKey(d)] even when idKey is a function,
        // so a function form only works if addIds:true is set — which we do not use.)
        augmented = data.map(d => ({
            ...d,
            _dnId: `${safeId(d[dimensionKey])}-${safeId(d[compositeKey])}`
        }));
        idKey = '_dnId';
    } else if (idField) {
        idKey = idField;
    } else {
        idKey = dimensionKey;
    }

    return {
        data: augmented,
        idKey,
        navigationRules: baseNavRules,
        dimensions: {
            values: [
                {
                    dimensionKey,
                    type: 'categorical' as const,
                    behavior: { extents: 'circular' as const },
                    // Explicitly name rules so edge tags match keys in baseNavRules.
                    // Without this, data-navigator auto-generates 'parent_<dimensionKey>'
                    // (e.g. 'parent_city'), which won't match the 'parent' rule.
                    operations: {
                        compressSparseDivisions: compressSparseDivisions || false,
                    },
                    navigationRules: {
                        sibling_sibling: ['left', 'right'],
                        parent_child: ['parent', 'child']
                    }
                }
            ]
        },
        genericEdges: [exitEdge]
    };
}

// ─── Chart description ───────────────────────────────────────────────────────

const humanChartType: Record<string, string> = {
    bar: 'bar chart',
    hbar: 'horizontal bar chart',
    scatter: 'scatter plot',
    cartesian: 'scatter plot',
    line: 'line chart',
    multiline: 'multi-line chart',
    crossline: 'cross-navigable multi-line chart',
    stacked_bar: 'stacked bar chart'
};

/**
 * Builds an accessible description for a chart's root node following the pattern:
 *   "[title | x and y]. [chart type]. [x axis info]. [y axis info].
 *    [grouping info]. [count sentence]."
 *
 * `dimensionCount` controls the count sentence:
 * - 0 or 1 (default): "contains N divisions and M data points" (or just M if equal)
 * - >1: "contains N dimensions and M total data points"
 *
 * For single-dimension charts, the string is set as `node.semantics.label` on the
 * dimension root so data-navigator's defaultDescribeNode announces it when a user
 * enters. For multi-dimension charts it is the label of an injected Level 0 node.
 */
export function buildChartDescription(options: BokehWrapperOptions, dimensionCount = 1): string {
    const { data, type, xField, yField, groupField, title } = options;
    const chartType = resolveChartType(type, data, xField, yField, groupField);

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const parts: string[] = [];

    // Opening: provided title, or a summary of the two primary encodings.
    if (title) {
        parts.push(title);
    } else if (xField && yField) {
        parts.push(`${cap(xField)} and ${cap(yField)}`);
    } else if (xField) {
        parts.push(cap(xField));
    }

    // Chart type.
    parts.push(humanChartType[chartType] ?? chartType);

    // Axis descriptions.
    if (xField) {
        const axisType = isNumericField(data, xField) ? 'numerical' : 'categorical';
        parts.push(`${xField} along x axis (${axisType})`);
    }
    if (yField) {
        const axisType = isNumericField(data, yField) ? 'numerical' : 'categorical';
        parts.push(`${yField} along y axis (${axisType})`);
    }

    // Additional encodings (color / grouping).
    if (groupField) {
        parts.push(`grouped by ${groupField}`);
    }

    // Data counts.
    const total = data.length;

    if (dimensionCount > 1) {
        // Multi-dimension: state the number of named dimensions and total data points.
        parts.push(`contains ${dimensionCount} dimensions and ${total} total data points`);
    } else {
        // Single dimension: "divisions" are unique values of the primary dimension key.
        // If divisions === total rows, stating both is redundant.
        let divisionKey: string | undefined;
        if (chartType === 'bar' || chartType === 'hbar') divisionKey = xField;
        else if (chartType === 'stacked_bar') divisionKey = xField;
        else if (chartType === 'multiline') divisionKey = groupField;

        if (divisionKey) {
            const divisions = new Set(data.map(d => d[divisionKey!])).size;
            if (divisions !== total) {
                parts.push(`contains ${divisions} divisions and ${total} total data points`);
            } else {
                parts.push(`contains ${total} total data points`);
            }
        } else {
            parts.push(`contains ${total} total data points`);
        }
    }

    return parts.map(cap).join('. ') + '.';
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
            base = buildDimensionStructure(data, catField, idField, '', options.compressSparseDivisions);
            break;
        }

        case 'stacked_bar': {
            const stackX = xField || 'x';
            const stackGroup = groupField || 'group';
            base = buildCrosslineStructure(data, stackX, stackGroup);
            break;
        }

        case 'multiline': {
            const lineGroup = groupField || 'series';
            base = buildDimensionStructure(data, lineGroup, idField, xField, options.compressSparseDivisions);
            break;
        }

        case 'cartesian': {
            const cartX = xField || 'x';
            const cartY = yField || 'y';
            base = buildCartesianStructure(data, cartX, cartY, idField);
            break;
        }

        case 'crossline': {
            const crossX = xField || 'x';
            const crossGroup = groupField || 'series';
            base = buildCrosslineStructure(data, crossX, crossGroup);
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
            auto.left = `Move to previous ${xField ?? 'category'}`;
            auto.right = `Move to next ${xField ?? 'category'}`;
            auto.child = `Drill into ${xField ?? 'category'} detail`;
            auto.parent = 'Go back up';
            auto.undo = 'Go back up';
            break;

        case 'scatter':
        case 'line':
            auto.left = `Move to previous ${xField ?? 'point'}`;
            auto.right = `Move to next ${xField ?? 'point'}`;
            break;

        case 'stacked_bar':
            auto.left    = `Move to previous ${xField ?? 'category'}`;
            auto.right   = `Move to next ${xField ?? 'category'}`;
            auto.up      = `Move to previous ${groupField ?? 'group'}`;
            auto.down    = `Move to next ${groupField ?? 'group'}`;
            auto.child   = 'Drill in';
            auto.xParent = `Go up to ${xField ?? 'category'} level`;
            auto.yParent = `Go up to ${groupField ?? 'group'} level`;
            break;

        case 'multiline':
            auto.left = `Move to previous ${groupField ?? 'series'}`;
            auto.right = `Move to next ${groupField ?? 'series'}`;
            auto.child = `Drill into ${groupField ?? 'series'} data`;
            auto.parent = 'Go back up';
            auto.undo = 'Go back up';
            break;

        case 'cartesian':
            auto.left = `Move to previous ${xField ?? 'x'} range`;
            auto.right = `Move to next ${xField ?? 'x'} range`;
            auto.up = `Move to previous ${yField ?? 'y'} range`;
            auto.down = `Move to next ${yField ?? 'y'} range`;
            auto.child = 'Drill in';
            auto.xParent = `Go up to ${xField ?? 'x'} level`;
            auto.yParent = `Go up to ${yField ?? 'y'} level`;
            break;

        case 'crossline':
            auto.left = `Move to previous ${xField ?? 'x-axis point'}`;
            auto.right = `Move to next ${xField ?? 'x-axis point'}`;
            auto.up = `Move to previous ${groupField ?? 'series'}`;
            auto.down = `Move to next ${groupField ?? 'series'}`;
            auto.child = 'Drill in';
            auto.xParent = `Go up to ${xField ?? 'x-axis'} level`;
            auto.yParent = `Go up to ${groupField ?? 'series'} level`;
            break;
    }

    // commandLabels from user wins
    return { ...auto, ...commandLabels };
}

// ─── Node semantics ──────────────────────────────────────────────────────────

/**
 * Generates a human-readable `semantics.label` for a single node.
 *
 * - Division node (has `data.values` map): "<value>. Contains N data point(s)."
 * - Leaf node (raw datum): "field: value. field: value." (internal _ fields excluded)
 * - Fallback: node id
 *
 * This label is consumed by data-navigator's rendering module (`aria-label`) in
 * keyboard mode, and by textChat's `defaultDescribeNode` when `semantics.label`
 * is present (textChat falls back to its own description when it is absent).
 */
export function buildNodeLabel(node: any): string {
    const data = node.data as Record<string, unknown> | undefined;
    if (!data) return String(node.id);

    // Dimension root node: data is a DimensionObject — has dimensionKey (string) + divisions (object).
    // These nodes fall through to the leaf branch otherwise, producing [object Object] for the
    // nested divisions/behavior/navigationRules fields.
    if (typeof data.dimensionKey === 'string' && data.divisions != null) {
        const divCount = Object.keys(data.divisions as object).length;
        return `${data.dimensionKey} dimension. Contains ${divCount} division${divCount !== 1 ? 's' : ''}.`;
    }

    // Division node: data.values is an object map of child nodes (DivisionObject shape)
    if (data.values != null && typeof data.values === 'object' && !Array.isArray(data.values)) {
        const dimKey = node.derivedNode as string | undefined;
        const dimValue = dimKey ? data[dimKey] : null;
        if (dimValue != null) {
            const childCount = Object.keys(data.values as object).length;
            return `${dimValue}. Contains ${childCount} data point${childCount !== 1 ? 's' : ''}.`;
        }
        return String(node.id);
    }

    // Leaf node: raw datum — skip internal '_' prefixed keys and any non-primitive values
    // (objects / arrays / functions would stringify as [object Object]).
    const parts = Object.entries(data)
        .filter(([k, v]) =>
            !k.startsWith('_') &&
            v != null &&
            typeof v !== 'object' &&
            typeof v !== 'function'
        )
        .map(([k, v]) => `${k}: ${v}`);
    return parts.length > 0 ? parts.join('. ') + '.' : String(node.id);
}

/**
 * Ensures every node in the structure has `semantics.label` set.
 *
 * Required by data-navigator's rendering module for every element it renders
 * in keyboard mode. Also used by textChat's `defaultDescribeNode` — textChat
 * uses the label when present and falls back to its own description when absent.
 *
 * Nodes that already have `semantics.label` (e.g. the dimension root set to the
 * full chart description) are left unchanged.
 */
export function prepareNodeSemantics(structure: Structure): void {
    for (const node of Object.values(structure.nodes)) {
        const n = node as any;
        if (!n.semantics?.label) {
            n.semantics = { ...(n.semantics ?? {}), label: buildNodeLabel(n) };
        }
    }
}

