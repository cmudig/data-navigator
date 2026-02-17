// Tree layout visualization for data-navigator structures.
// Arranges dimension, division, and leaf nodes in a deterministic hierarchy.
// For 2+ dimensions, leaf nodes are placed in a grid layout.

import { map, sort } from 'd3-array';
import { scaleOrdinal } from 'd3-scale';
import { schemeTableau10 } from 'd3-scale-chromatic';
import { create } from 'd3-selection';

export function TreeGraph(
    {
        nodes,
        links
    },
    {
        nodeId = d => d.id,
        nodeGroup,
        nodeGroups,
        nodeRadius = 5,
        colors = schemeTableau10,
        width = 640,
        height = 400,
        dimensions,
        description,
        hide
    } = {}
) {
    // Compute values (same pattern as ForceGraph).
    const N = map(nodes, nodeId).map(intern);
    const G = nodeGroup == null ? null : map(nodes, nodeGroup).map(intern);

    // Build a lookup from node id to original node data.
    const nodeById = {};
    nodes.forEach((n, i) => { nodeById[N[i]] = n; });

    // Replace input nodes with positioned objects.
    nodes = map(nodes, (_, i) => ({ id: N[i], x: 0, y: 0 }));
    const nodeObjById = {};
    nodes.forEach(n => { nodeObjById[n.id] = n; });

    // Map links to source/target ids.
    const linkData = map(links, (l) => ({
        source: intern(l.source),
        target: intern(l.target),
        navigationRules: l.navigationRules || []
    }));

    description =
        (typeof description === 'function' ? description(nodes, linkData) : description) ||
        `Tree layout. Contains ${nodes.length} node${nodes.length !== 1 ? 's' : ''} and ${linkData.length} link${
            linkData.length !== 1 ? 's' : ''
        }.`;

    // Compute default domains and color scale.
    if (G && nodeGroups === undefined) nodeGroups = sort(G);
    const color = nodeGroup == null ? null : scaleOrdinal(nodeGroups, colors);

    // Build set of parent-child navigation rule names.
    const parentChildRules = new Set(['parent', 'child']);
    if (dimensions) {
        Object.values(dimensions).forEach(dim => {
            (dim.navigationRules?.parent_child || []).forEach(r => parentChildRules.add(r));
        });
    }

    // Classify links.
    const parentChildLinks = [];
    const siblingLinks = [];
    linkData.forEach(l => {
        const rules = l.navigationRules;
        if (!rules || rules.length === 0) return;
        // Skip exit/undo edges
        if (rules.includes('exit') || rules.includes('undo')) return;
        const isParentChild = rules.some(r => parentChildRules.has(r));
        if (isParentChild) {
            parentChildLinks.push(l);
        } else {
            siblingLinks.push(l);
        }
    });

    // Classify nodes by level.
    const level0 = [];
    const level1 = [];
    const level2 = [];
    const leafNodes = [];
    const otherNodes = [];

    nodes.forEach(n => {
        const orig = nodeById[n.id];
        if (!orig) { otherNodes.push(n); return; }
        const dl = orig.dimensionLevel;
        const dn = orig.derivedNode;
        if (dl === 0) level0.push(n);
        else if (dl === 1) level1.push(n);
        else if (dl === 2) level2.push(n);
        else if (dl === undefined && dn === undefined && orig.data) leafNodes.push(n);
        else otherNodes.push(n);
    });

    // Build leaf-to-division mapping from dimensions.
    // leafDivisions[leafId] = { dimensionKey: divisionId, ... }
    const leafDivisions = {};
    const dimKeys = dimensions ? Object.keys(dimensions) : [];
    const dimOrder = []; // ordered list of dimension keys
    if (dimensions) {
        dimKeys.forEach(key => {
            dimOrder.push(key);
            const dim = dimensions[key];
            const divIds = Object.keys(dim.divisions || {});
            // Skip the "single division" case where divId === dim.nodeId
            const isSingleDiv = divIds.length === 1 && divIds[0] === dim.nodeId;
            divIds.forEach(divId => {
                const div = dim.divisions[divId];
                Object.keys(div.values || {}).forEach(leafId => {
                    if (!leafDivisions[leafId]) leafDivisions[leafId] = {};
                    leafDivisions[leafId][key] = isSingleDiv ? dim.nodeId : divId;
                });
            });
        });
    }

    // Organize level2 nodes by their parent dimension.
    const divisionsByDim = {};
    dimOrder.forEach(key => { divisionsByDim[key] = []; });
    level2.forEach(n => {
        const orig = nodeById[n.id];
        if (orig && orig.derivedNode && divisionsByDim[orig.derivedNode]) {
            divisionsByDim[orig.derivedNode].push(n);
        }
    });

    // Compute layout positions.
    const padding = { top: 30, bottom: 20, left: 30, right: 30 };
    const usableWidth = width - padding.left - padding.right;
    const usableHeight = height - padding.top - padding.bottom;

    // Determine rows: level0 (optional), level1, level2, leaves
    const hasLevel0 = level0.length > 0;
    const rowCount = (hasLevel0 ? 1 : 0) + 1 + 1 + 1; // l0?, l1, l2, leaves
    const rowSpacing = usableHeight / (rowCount - 1 || 1);

    let currentRow = 0;
    const yFor = (row) => padding.top + row * rowSpacing;

    // Level 0
    if (hasLevel0) {
        const y = yFor(currentRow);
        level0.forEach((n, i) => {
            n.x = padding.left + usableWidth / 2;
            n.y = y;
        });
        currentRow++;
    }

    // Level 1 (dimensions) — evenly spaced
    const dimY = yFor(currentRow);
    const dimCount = level1.length || 1;
    // Map dimension nodeId to its horizontal allocation
    const dimAlloc = {};
    level1.forEach((n, i) => {
        const x = padding.left + (usableWidth / (dimCount + 1)) * (i + 1);
        n.x = x;
        n.y = dimY;
        dimAlloc[n.id] = {
            x,
            idx: i,
            rangeStart: padding.left + (usableWidth / dimCount) * i,
            rangeEnd: padding.left + (usableWidth / dimCount) * (i + 1)
        };
    });
    currentRow++;

    // Level 2 (divisions) — grouped under their parent dimension
    const divY = yFor(currentRow);
    const divAlloc = {}; // divisionId -> { x, dimKey }
    dimOrder.forEach(key => {
        const dim = dimensions ? dimensions[key] : null;
        if (!dim) return;
        const alloc = dimAlloc[dim.nodeId];
        if (!alloc) return;
        const divs = divisionsByDim[key] || [];
        if (divs.length === 0) return;
        const range = alloc.rangeEnd - alloc.rangeStart;
        const divSpacing = range / (divs.length + 1);
        divs.forEach((n, i) => {
            n.x = alloc.rangeStart + divSpacing * (i + 1);
            n.y = divY;
            divAlloc[n.id] = { x: n.x, dimKey: key, idx: i };
        });
    });
    currentRow++;

    // Leaf nodes
    const leafY = yFor(currentRow);
    if (dimOrder.length === 0 || !dimensions) {
        // No dimensions — flat row
        leafNodes.forEach((n, i) => {
            n.x = padding.left + (usableWidth / (leafNodes.length + 1)) * (i + 1);
            n.y = leafY;
        });
    } else if (dimOrder.length === 1) {
        // Single dimension — spread leaves under their division parent
        const key = dimOrder[0];
        const dim = dimensions[key];
        const divIds = Object.keys(dim.divisions || {});
        divIds.forEach(divId => {
            const div = dim.divisions[divId];
            const leafIds = Object.keys(div.values || {});
            const parentX = divAlloc[divId]?.x || width / 2;
            const spreadWidth = usableWidth / (divIds.length || 1);
            const leafSpacing = spreadWidth / (leafIds.length + 1);
            leafIds.forEach((leafId, i) => {
                const n = nodeObjById[leafId];
                if (n) {
                    n.x = parentX - spreadWidth / 2 + leafSpacing * (i + 1);
                    n.y = leafY;
                }
            });
        });
    } else {
        // 2+ dimensions — grid layout
        // First dimension controls columns, second controls rows
        const dim1Key = dimOrder[0];
        const dim2Key = dimOrder[1];
        const dim1 = dimensions[dim1Key];
        const dim2 = dimensions[dim2Key];
        const div1Ids = Object.keys(dim1.divisions || {});
        const div2Ids = Object.keys(dim2.divisions || {});

        const cols = div1Ids.length || 1;
        const rows = div2Ids.length || 1;

        // Grid occupies the leaf area but may expand vertically
        const gridTop = leafY - rowSpacing * 0.3;
        const gridBottom = height - padding.bottom;
        const gridHeight = gridBottom - gridTop;
        const colSpacing = usableWidth / (cols + 1);
        const rowSpacingGrid = gridHeight / (rows + 1);

        leafNodes.forEach(n => {
            const ld = leafDivisions[n.id];
            if (!ld) {
                // Unaffiliated leaf — place to the right
                n.x = width - padding.right;
                n.y = leafY;
                return;
            }
            const colDivId = ld[dim1Key];
            const rowDivId = ld[dim2Key];
            const colIdx = div1Ids.indexOf(colDivId);
            const rowIdx = div2Ids.indexOf(rowDivId);
            n.x = padding.left + colSpacing * ((colIdx >= 0 ? colIdx : 0) + 1);
            n.y = gridTop + rowSpacingGrid * ((rowIdx >= 0 ? rowIdx : 0) + 1);
        });
    }

    // Other nodes (exit, etc.) — placed bottom-right
    otherNodes.forEach((n, i) => {
        n.x = width - padding.right - (i * nodeRadius * 3);
        n.y = height - padding.bottom;
    });

    // Build the SVG.
    const svg = create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('role', hide ? 'presentation' : 'img')
        .attr('aria-label', hide ? null : description)
        .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    // Draw sibling links (dashed, behind parent-child links).
    svg.append('g')
        .attr('class', 'tree-sibling-links')
        .selectAll('line')
        .data(siblingLinks)
        .join('line')
        .attr('x1', d => nodeObjById[d.source]?.x || 0)
        .attr('y1', d => nodeObjById[d.source]?.y || 0)
        .attr('x2', d => nodeObjById[d.target]?.x || 0)
        .attr('y2', d => nodeObjById[d.target]?.y || 0)
        .attr('stroke', '#bbb')
        .attr('stroke-opacity', 0.25)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,2');

    // Draw parent-child links (solid).
    svg.append('g')
        .attr('class', 'tree-parent-child-links')
        .selectAll('line')
        .data(parentChildLinks)
        .join('line')
        .attr('x1', d => nodeObjById[d.source]?.x || 0)
        .attr('y1', d => nodeObjById[d.source]?.y || 0)
        .attr('x2', d => nodeObjById[d.target]?.x || 0)
        .attr('y2', d => nodeObjById[d.target]?.y || 0)
        .attr('stroke', '#666')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 1.5);

    // Draw nodes.
    const node = svg
        .append('g')
        .attr('fill', 'currentColor')
        .attr('stroke', '#fff')
        .attr('stroke-opacity', 1)
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', nodeRadius)
        .attr('role', 'presentation');

    if (G) node.attr('fill', ({ id }) => {
        const idx = N.indexOf(id);
        return idx >= 0 ? color(G[idx]) : '#999';
    });

    function intern(value) {
        return value !== null && typeof value === 'object' ? value.valueOf() : value;
    }

    return Object.assign(svg.node(), { scales: { color } });
}
