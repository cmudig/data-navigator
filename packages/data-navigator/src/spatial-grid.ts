import type { Edges, NodeId, NodeObject, Nodes, SpatialGridInfo, StructureOptions } from './data-navigator';
import { makeEdgeCreator, chain } from './edge-utils';
import { createValidId } from './utilities';

/*
    Builds a nested 2D grid. Each zoom level in options.spatialGrid.levels splits the x and y extents
    into that many cells per axis (for example [2, 4] makes a 2x2 grid, then a 4x4 grid).
    Rows are placed in the cell that holds their x and y values.

    leaves:
      'points' (default): rows sit inside the finest cells (scatterplots).
      'cells': each row is already a cell (heatmaps). Rows become the finest level.

    levelNavigation:
      'across' (default): arrow keys move across every cell at a zoom level, crossing region borders.
      'within': arrow keys stay inside the parent region.

    Rule pairs follow the library convention [moveToSource, moveToTarget].
    x edges go from lower to higher x. y edges go from higher to lower y, so the default
    ['up', 'down'] moves up toward higher values.
*/
export const buildSpatialGrid = (
    options: StructureOptions,
    nodes: Nodes,
    edges: Edges
): SpatialGridInfo | undefined => {
    const g = options.spatialGrid;
    if (!g) return;
    const createEdge = makeEdgeCreator(nodes, edges, options.useDirectedEdges);
    const xRules = g.navigationRules?.x || ['left', 'right'];
    const yRules = g.navigationRules?.y || ['up', 'down'];
    const parentRules = g.navigationRules?.parent_child || ['drill-out', 'drill-in'];
    const extents = g.extents || 'terminal';
    const across = g.levelNavigation !== 'within';
    const skipEmpty = g.skipEmpty !== false;
    const leafMode = g.leaves || 'points';
    const idOf = d => d[typeof options.idKey === 'function' ? options.idKey(d) : options.idKey];

    const rows = options.data.filter(d => typeof d[g.xKey] === 'number' && typeof d[g.yKey] === 'number');
    const ext = (key: string, given?: [number, number]): [number, number] => {
        if (given) return given;
        let min = Infinity;
        let max = -Infinity;
        rows.forEach(d => {
            min = Math.min(min, d[key]);
            max = Math.max(max, d[key]);
        });
        return [min, max];
    };
    const xExtent = ext(g.xKey, g.xExtent);
    const yExtent = ext(g.yKey, g.yExtent);
    const indexOf = (v: number, [lo, hi]: [number, number], n: number) => {
        if (hi === lo) return 0;
        return Math.max(0, Math.min(n - 1, Math.floor(((v - lo) / (hi - lo)) * n)));
    };

    // root
    const rootDefaults = { id: 'grid', edges: [], semantics: { label: 'Grid' } } as NodeObject;
    const root = { ...rootDefaults, ...(g.root || {}) } as NodeObject;
    root.edges = root.edges || [];
    root.depth = 0;
    root.data = {
        ...(root.data || {}),
        xKey: g.xKey,
        yKey: g.yKey,
        xExtent,
        yExtent,
        levels: g.levels,
        count: rows.length
    };
    nodes[root.id] = root;

    const cellId = (level: number, col: number, row: number) =>
        g.cellIds ? g.cellIds(level, col, row) : createValidId(`${root.id}_L${level}_${col}_${row}`);

    // build region cells for each zoom level
    type Cell = { id: NodeId; col: number; row: number; parent?: NodeId; children: Array<NodeId> };
    const cellsByLevel: Array<Record<string, Cell>> = [];
    g.levels.forEach((n, level) => {
        const cells: Record<string, Cell> = {};
        const add = (col: number, row: number) => {
            const key = `${col}_${row}`;
            if (cells[key]) return cells[key];
            const id = cellId(level, col, row);
            const xStep = (xExtent[1] - xExtent[0]) / n;
            const yStep = (yExtent[1] - yExtent[0]) / n;
            let parent: NodeId = root.id;
            if (level > 0) {
                const pn = g.levels[level - 1];
                const parentCell =
                    cellsByLevel[level - 1][`${Math.floor((col * pn) / n)}_${Math.floor((row * pn) / n)}`];
                parent = parentCell?.id;
                parentCell?.children.push(id);
            }
            cells[key] = { id, col, row, parent, children: [] };
            nodes[id] = {
                id,
                renderId: id,
                edges: [],
                depth: level + 1,
                parentId: parent,
                data: {
                    level,
                    col,
                    row,
                    cellsPerAxis: n,
                    xExtent: [xExtent[0] + col * xStep, xExtent[0] + (col + 1) * xStep],
                    yExtent: [yExtent[0] + row * yStep, yExtent[0] + (row + 1) * yStep],
                    count: 0
                }
            } as NodeObject;
            return cells[key];
        };
        if (!skipEmpty) {
            for (let c = 0; c < n; c++) for (let r = 0; r < n; r++) add(c, r);
        }
        rows.forEach(d => add(indexOf(d[g.xKey], xExtent, n), indexOf(d[g.yKey], yExtent, n)));
        cellsByLevel.push(cells);
    });

    // place rows in the finest cells and count rows in every cell
    const finest = cellsByLevel[cellsByLevel.length - 1];
    const fn = g.levels[g.levels.length - 1];
    const leafIds: Array<NodeId> = [];
    const leafParent: Record<NodeId, NodeId> = {};
    rows.forEach(d => {
        const id = idOf(d);
        if (!nodes[id]) return;
        g.levels.forEach((n, level) => {
            const c = cellsByLevel[level][`${indexOf(d[g.xKey], xExtent, n)}_${indexOf(d[g.yKey], yExtent, n)}`];
            nodes[c.id].data.count++;
        });
        const cell = finest[`${indexOf(d[g.xKey], xExtent, fn)}_${indexOf(d[g.yKey], yExtent, fn)}`];
        cell.children.push(id);
        leafParent[id] = cell.id;
        leafIds.push(id);
        nodes[id].parentId = cell.id;
        nodes[id].depth = g.levels.length + 1;
    });

    // parent links for region cells
    const topLeftFirst = (a: { col: number; row: number }, b: { col: number; row: number }) =>
        b.row - a.row || a.col - b.col;
    const rootChildren = Object.values(cellsByLevel[0]).sort(topLeftFirst);
    if (rootChildren.length) createEdge(root.id, rootChildren[0].id, parentRules, 'source');
    rootChildren.forEach(c => createEdge(root.id, c.id, parentRules, 'target'));

    const pos = (id: NodeId) => nodes[id].data;
    cellsByLevel.forEach((cells, level) => {
        Object.values(cells).forEach(c => {
            if (!c.children.length) return;
            let first: NodeId;
            if (level === cellsByLevel.length - 1) {
                first = [...c.children].sort((a, b) => leafOrderX(a, b))[0];
            } else {
                first = [...c.children].sort((a, b) => topLeftFirst(pos(a), pos(b)))[0];
            }
            createEdge(c.id, first, parentRules, 'source');
            c.children.forEach(k => createEdge(c.id, k, parentRules, 'target'));
        });
    });

    // sibling links for region cells at each zoom level
    const linkCells = (ids: Array<NodeId>) => {
        const byRow: Record<number, Array<NodeId>> = {};
        const byCol: Record<number, Array<NodeId>> = {};
        ids.forEach(id => {
            const p = pos(id);
            (byRow[p.row] = byRow[p.row] || []).push(id);
            (byCol[p.col] = byCol[p.col] || []).push(id);
        });
        Object.values(byRow).forEach(r =>
            chain(
                createEdge,
                r.sort((a, b) => pos(a).col - pos(b).col),
                xRules,
                extents
            )
        );
        Object.values(byCol).forEach(c =>
            chain(
                createEdge,
                c.sort((a, b) => pos(b).row - pos(a).row),
                yRules,
                extents
            )
        );
    };
    cellsByLevel.forEach((cells, level) => {
        const list = Object.values(cells);
        if (across || level === 0) {
            linkCells(list.map(c => c.id));
        } else {
            const groups: Record<NodeId, Array<NodeId>> = {};
            list.forEach(c => (groups[c.parent] = groups[c.parent] || []).push(c.id));
            Object.values(groups).forEach(linkCells);
        }
    });

    // sibling links for leaves
    function leafOrderX(a: NodeId, b: NodeId) {
        const da = nodes[a].data;
        const db = nodes[b].data;
        return da[g.xKey] - db[g.xKey] || db[g.yKey] - da[g.yKey];
    }
    const leafOrderY = (a: NodeId, b: NodeId) => {
        const da = nodes[a].data;
        const db = nodes[b].data;
        return db[g.yKey] - da[g.yKey] || da[g.xKey] - db[g.xKey];
    };
    const linkLeaves = (ids: Array<NodeId>) => {
        if (leafMode === 'cells') {
            // cells sit on a grid: link rows and columns by their x and y values
            const byY: Record<string, Array<NodeId>> = {};
            const byX: Record<string, Array<NodeId>> = {};
            ids.forEach(id => {
                const d = nodes[id].data;
                (byY[d[g.yKey]] = byY[d[g.yKey]] || []).push(id);
                (byX[d[g.xKey]] = byX[d[g.xKey]] || []).push(id);
            });
            Object.values(byY).forEach(r => chain(createEdge, r.sort(leafOrderX), xRules, extents));
            Object.values(byX).forEach(c => chain(createEdge, c.sort(leafOrderY), yRules, extents));
        } else {
            chain(createEdge, [...ids].sort(leafOrderX), xRules, extents);
            chain(createEdge, [...ids].sort(leafOrderY), yRules, extents);
        }
    };
    if (across) {
        linkLeaves(leafIds);
    } else {
        Object.values(finest).forEach(c => linkLeaves(c.children));
    }

    return {
        rootId: root.id,
        levels: g.levels,
        cellsByLevel: cellsByLevel.map(cells => Object.values(cells).map(c => c.id)),
        leafIds,
        parentRules: parentRules as [string, string]
    };
};
