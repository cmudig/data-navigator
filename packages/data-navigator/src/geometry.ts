/**
 * geometry — Pure SVG path geometry utilities for data navigation group shapes.
 *
 * All functions are side-effect-free: input is arrays of Rect/Point objects,
 * output is an SVG path `d` string ready to set on a <path d="..."> element.
 *
 * Exported from the data-navigator core library so downstream tools (e.g.
 * the Skeleton scaffolding app) can import them, and they can be packaged
 * independently in future export flows.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type Rect = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };
export type Circle = Point & { r: number };

// ── Convex Hull (Graham scan) ─────────────────────────────────────────────────

/**
 * Compute the convex hull of a set of 2-D points using the Graham scan
 * algorithm. Returns the hull vertices in counter-clockwise order.
 * Returns an empty array when fewer than 3 distinct points are supplied.
 */
export function grahamScan(points: Point[]): Point[] {
    if (points.length < 3) return [...points];

    // Find the lowest-y (then leftmost) point as the pivot
    let pivot = points[0];
    for (const p of points) {
        if (p.y < pivot.y || (p.y === pivot.y && p.x < pivot.x)) pivot = p;
    }

    // Sort by polar angle relative to pivot; break ties by distance (nearer first)
    const sorted = [...points].sort((a, b) => {
        const ax = a.x - pivot.x,
            ay = a.y - pivot.y;
        const bx = b.x - pivot.x,
            by = b.y - pivot.y;
        const cross = ax * by - ay * bx;
        if (cross !== 0) return -cross; // counter-clockwise order
        return ax * ax + ay * ay - (bx * bx + by * by);
    });

    const hull: Point[] = [];
    for (const p of sorted) {
        while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
            hull.pop();
        }
        hull.push(p);
    }
    return hull;
}

function cross(O: Point, A: Point, B: Point): number {
    return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
}

/**
 * Convex hull of a set of points as a closed SVG path string.
 * Returns empty string when fewer than 2 points are given.
 */
export function convexHullPath(points: Point[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) {
        const p = points[0];
        return `M${p.x},${p.y}Z`;
    }
    const hull = grahamScan(points);
    if (hull.length === 0) return '';
    const [first, ...rest] = hull;
    return `M${fmt(first.x)},${fmt(first.y)}` + rest.map(p => `L${fmt(p.x)},${fmt(p.y)}`).join('') + 'Z';
}

/**
 * Expand a convex hull polygon outward from its centroid by `padPx` pixels.
 * Each hull vertex is pushed radially away from the centroid.
 */
export function expandHull(hullPoints: Point[], padPx: number): Point[] {
    if (padPx === 0 || hullPoints.length === 0) return hullPoints;
    const cx = hullPoints.reduce((s, p) => s + p.x, 0) / hullPoints.length;
    const cy = hullPoints.reduce((s, p) => s + p.y, 0) / hullPoints.length;
    return hullPoints.map(p => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return p;
        return { x: p.x + (dx / dist) * padPx, y: p.y + (dy / dist) * padPx };
    });
}

// ── Rect corners helper ───────────────────────────────────────────────────────

/** Return the 4 corner points of a rect. */
function rectCorners(r: Rect): Point[] {
    return [
        { x: r.x, y: r.y },
        { x: r.x + r.width, y: r.y },
        { x: r.x + r.width, y: r.y + r.height },
        { x: r.x, y: r.y + r.height }
    ];
}

/** Expand a rect by `pad` pixels on all four sides. */
function padRect(r: Rect, pad: number): Rect {
    return { x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
}

// ── Convex hull of rectangles ─────────────────────────────────────────────────

/**
 * Convex hull of a set of axis-aligned rectangles.
 * Collects all 4 corners of every rect and runs Graham scan.
 * Returns a closed SVG path string.
 */
export function convexHullOfRects(rects: Rect[], padPx = 0): string {
    if (rects.length === 0) return '';
    const corners = rects.flatMap(rectCorners);
    const hull = grahamScan(corners);
    const expanded = padPx > 0 ? expandHull(hull, padPx) : hull;
    return hullToPath(expanded);
}

// ── Union of rects (true disconnected subpaths) ───────────────────────────────

/**
 * Convert an array of rects into an SVG path containing one M…Z subpath per
 * rect. This is a "true union" — non-overlapping marks each get their own
 * outlined region. SVG fill-rule handles interior fill for all subpaths.
 *
 * @param padPx  Optional padding added to every rect before generating paths.
 */
export function unionOfRectPaths(rects: Rect[], padPx = 0): string {
    if (rects.length === 0) return '';
    return rects
        .map(r => {
            const pr = padPx > 0 ? padRect(r, padPx) : r;
            const { x, y, width: w, height: h } = pr;
            return `M${fmt(x)},${fmt(y)}L${fmt(x + w)},${fmt(y)}L${fmt(x + w)},${fmt(y + h)}L${fmt(x)},${fmt(y + h)}Z`;
        })
        .join('');
}

// ── Bounding rect of all rects ────────────────────────────────────────────────

/**
 * Single axis-aligned bounding rect enclosing all input rects.
 * Returns a closed SVG path string (one M…Z rectangle).
 *
 * @param padPx  Optional outward padding added to the resulting bounding box.
 */
export function boundingRectPath(rects: Rect[], padPx = 0): string {
    if (rects.length === 0) return '';
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const r of rects) {
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.width);
        maxY = Math.max(maxY, r.y + r.height);
    }
    minX -= padPx;
    minY -= padPx;
    maxX += padPx;
    maxY += padPx;
    return `M${fmt(minX)},${fmt(minY)}L${fmt(maxX)},${fmt(minY)}L${fmt(maxX)},${fmt(maxY)}L${fmt(minX)},${fmt(maxY)}Z`;
}

// ── Convex hull of circles ────────────────────────────────────────────────────

/**
 * Convex hull of a set of circles.
 * Each circle is approximated by 16 sample points on its circumference before
 * running Graham scan. The result is a polygon that is tangent (or very close)
 * to the outer boundary of all circles.
 *
 * Used for scatter plots and line-chart interval groupings where marks are
 * circular (not rectangular).
 */
export function convexHullOfCircles(circles: Circle[], padPx = 0): string {
    if (circles.length === 0) return '';
    const SAMPLES = 16;
    const points: Point[] = [];
    for (const { x, y, r } of circles) {
        const effectiveR = r + padPx;
        for (let i = 0; i < SAMPLES; i++) {
            const angle = (2 * Math.PI * i) / SAMPLES;
            points.push({
                x: x + effectiveR * Math.cos(angle),
                y: y + effectiveR * Math.sin(angle)
            });
        }
    }
    return convexHullPath(points);
}

// ── Offset line path ──────────────────────────────────────────────────────────

/**
 * Create a "fat" closed path around a polyline by tracing it at ±offsetPx
 * using perpendicular offsets at each segment.
 *
 * The result is a single closed SVG path that looks like the line rendered
 * with a stroke of width `offsetPx * 2`. Ideal for line-chart series grouping.
 *
 * @param points    Ordered control points of the polyline (left to right).
 * @param offsetPx  Half-width of the resulting fat path.
 */
export function offsetLinePath(points: Point[], offsetPx: number): string {
    if (points.length < 2) {
        if (points.length === 1) {
            // Degenerate: single point → circle approximation
            const p = points[0];
            return convexHullOfCircles([{ x: p.x, y: p.y, r: offsetPx }]);
        }
        return '';
    }

    // Build per-segment unit normals (perpendicular, pointing "left" of travel)
    const normals: Point[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const len = Math.hypot(dx, dy);
        normals.push(len === 0 ? { x: 0, y: -1 } : { x: -dy / len, y: dx / len });
    }

    // Per-vertex averaged normal (miter join)
    const vertexNormals: Point[] = [];
    for (let i = 0; i < points.length; i++) {
        if (i === 0) {
            vertexNormals.push(normals[0]);
        } else if (i === points.length - 1) {
            vertexNormals.push(normals[normals.length - 1]);
        } else {
            const n1 = normals[i - 1];
            const n2 = normals[i];
            const avg = { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 };
            const len = Math.hypot(avg.x, avg.y);
            vertexNormals.push(len === 0 ? n1 : { x: avg.x / len, y: avg.y / len });
        }
    }

    // Left side (forward): point + normal * offset
    const left = points.map((p, i) => ({
        x: p.x + vertexNormals[i].x * offsetPx,
        y: p.y + vertexNormals[i].y * offsetPx
    }));

    // Right side (reverse): point - normal * offset
    const right = points
        .map((p, i) => ({
            x: p.x - vertexNormals[i].x * offsetPx,
            y: p.y - vertexNormals[i].y * offsetPx
        }))
        .reverse();

    // Build path: left forward → round cap → right reverse → round cap → close
    const firstLeft = left[0];
    let d = `M${fmt(firstLeft.x)},${fmt(firstLeft.y)}`;
    for (let i = 1; i < left.length; i++) {
        d += `L${fmt(left[i].x)},${fmt(left[i].y)}`;
    }
    // Right-end rounded cap (arc)
    const lastLeft = left[left.length - 1];
    const firstRight = right[0];
    d += arcCap(lastLeft, firstRight, offsetPx);
    for (let i = 1; i < right.length; i++) {
        d += `L${fmt(right[i].x)},${fmt(right[i].y)}`;
    }
    // Left-end rounded cap (arc back to start)
    const lastRight = right[right.length - 1];
    d += arcCap(lastRight, firstLeft, offsetPx);
    d += 'Z';
    return d;
}

/** SVG arc command connecting two endpoints with a semicircle of radius r. */
function arcCap(from: Point, to: Point, r: number): string {
    return `A${fmt(r)},${fmt(r)},0,0,0,${fmt(to.x)},${fmt(to.y)}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a number for SVG path coordinates (max 2 decimal places). */
function fmt(n: number): string {
    return Math.round(n * 100) / 100 + '';
}

/** Convert hull point array to a closed SVG path string. */
function hullToPath(hull: Point[]): string {
    if (hull.length === 0) return '';
    const [first, ...rest] = hull;
    return `M${fmt(first.x)},${fmt(first.y)}` + rest.map(p => `L${fmt(p.x)},${fmt(p.y)}`).join('') + 'Z';
}
