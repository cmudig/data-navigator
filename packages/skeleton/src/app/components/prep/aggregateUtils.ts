/**
 * Pure aggregate calculation utilities for label builder previews.
 * These functions are modular and can be used across the skeleton package.
 */

type Row = Record<string, unknown>;

// ── Linear regression ────────────────────────────────────────────────────────

export function linearRegression(
    xs: number[],
    ys: number[],
): { slope: number; intercept: number; r2: number } {
    const n = xs.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let ssXX = 0, ssXY = 0, ssYY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        ssXX += dx * dx;
        ssXY += dx * dy;
        ssYY += dy * dy;
    }

    if (ssXX === 0) return { slope: 0, intercept: meanY, r2: 0 };

    const slope = ssXY / ssXX;
    const intercept = meanY - slope * meanX;
    const r2 = ssYY === 0 ? 1 : (ssXY * ssXY) / (ssXX * ssYY);
    return { slope, intercept, r2 };
}

/**
 * Encode a field's values as numbers.
 * - If values are already numeric, use them as-is.
 * - If categorical, assign integer indices by order of first appearance.
 */
export function encodeAsNumbers(data: Row[], field: string): number[] {
    const categoryMap = new Map<string, number>();
    return data.map(row => {
        const raw = row[field];
        const num = Number(raw);
        if (raw !== null && raw !== undefined && raw !== '' && !isNaN(num)) {
            return num;
        }
        const key = String(raw ?? '');
        if (!categoryMap.has(key)) categoryMap.set(key, categoryMap.size);
        return categoryMap.get(key)!;
    });
}

// ── Basic aggregates ─────────────────────────────────────────────────────────

export function calcCount(data: Row[]): number {
    return data.length;
}

/** Number of distinct values for `field` across all rows. */
export function calcSubcount(data: Row[], field: string): number {
    return new Set(data.map(row => String(row[field] ?? ''))).size;
}

export function calcMin(data: Row[], field: string): number {
    const nums = data.map(row => Number(row[field])).filter(n => !isNaN(n));
    return nums.length ? Math.min(...nums) : NaN;
}

export function calcMax(data: Row[], field: string): number {
    const nums = data.map(row => Number(row[field])).filter(n => !isNaN(n));
    return nums.length ? Math.max(...nums) : NaN;
}

export function calcSum(data: Row[], field: string): number {
    const nums = data.map(row => Number(row[field])).filter(n => !isNaN(n));
    return nums.reduce((a, b) => a + b, 0);
}

export function calcAvg(data: Row[], field: string): number {
    const nums = data.map(row => Number(row[field])).filter(n => !isNaN(n));
    if (!nums.length) return NaN;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ── Trend / R² ───────────────────────────────────────────────────────────────

/**
 * Returns a human-readable trend direction string.
 * X can be categorical or numerical; Y must be numerical.
 * Classification uses Pearson |r| thresholds (0.3 and 0.7).
 */
export function calcTrend(data: Row[], xField: string, yField: string): string {
    if (data.length < 2) return 'flat';
    const xs = encodeAsNumbers(data, xField);
    const ys = encodeAsNumbers(data, yField);
    const { slope, r2 } = linearRegression(xs, ys);
    const r = Math.sqrt(Math.abs(r2)) * Math.sign(slope);
    const absR = Math.abs(r);
    if (absR < 0.3) return 'flat';
    const strength = absR >= 0.7 ? 'strongly' : 'slightly';
    const direction = r > 0 ? 'increasing' : 'decreasing';
    return `${strength} ${direction}`;
}

/**
 * Returns the coefficient of determination (R²) for a linear fit.
 * X can be categorical or numerical; Y must be numerical.
 */
export function calcR2(data: Row[], xField: string, yField: string): number {
    if (data.length < 2) return 0;
    const xs = encodeAsNumbers(data, xField);
    const ys = encodeAsNumbers(data, yField);
    return linearRegression(xs, ys).r2;
}

// ── Template helpers ─────────────────────────────────────────────────────────

/** Remove trailing commas/spaces and collapse multiple spaces in a template. */
export function normalizeTemplate(t: string): string {
    return t.replace(/,\s*$/, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Strip the natural language wrappers added by the dimension label builder,
 * leaving only the bare aggregate tokens.
 */
export function stripNaturalLanguage(template: string): string {
    let t = template;
    // Count with subcount
    t = t.replace(/ contains \{subcount\} subgroups and \{count\} total child data points/g, ' {subcount}, {count}');
    // Count without subcount
    t = t.replace(/ contains \{count\} total child data points/g, ' {count}');
    // Min/Max
    t = t.replace(/, ranging from \{min:"([^"]+)"\} to \{max:"([^"]+)"\}/g, ', {min:"$1"}, {max:"$2"}');
    // Sum
    t = t.replace(/, total: \{sum:"([^"]+)"\}/g, ', {sum:"$1"}');
    // Average
    t = t.replace(/, average: \{avg:"([^"]+)"\}/g, ', {avg:"$1"}');
    // Trend
    t = t.replace(/, trend: \{trend:"([^"]+)":"([^"]+)"\}/g, ', {trend:"$1":"$2"}');
    // R²
    t = t.replace(/, R²: \{r2:"([^"]+)":"([^"]+)"\}/g, ', {r2:"$1":"$2"}');
    return normalizeTemplate(t);
}

/** Format a number for display: up to 2 decimal places, no trailing zeros. */
export function formatNum(n: number): string {
    if (isNaN(n)) return '—';
    if (Number.isInteger(n)) return String(n);
    return parseFloat(n.toFixed(2)).toString();
}
