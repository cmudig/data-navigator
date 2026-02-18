/**
 * SVG highlight module: manages opacity on SVG elements in response to
 * menu state changes (checkbox selections and hover).
 *
 * Uses inline style.opacity for reliability across SVG rendering contexts,
 * and builds direct element reference maps at setup time to avoid fragile
 * CSS selector lookups.
 */

const DIMMED_OPACITY = '0.5';
const FULL_OPACITY = '';
const HOVER_STROKE_WIDTH = '3';
const SELECTED_EDGE_STROKE = '#222';
const SELECTED_EDGE_WIDTH = '2.5';
const SELECTED_NODE_STROKE = '#222';
const SELECTED_NODE_STROKE_WIDTH = '2';
const DYNAMIC_EDGE_STROKE = '#888';
const DYNAMIC_EDGE_STROKE_WIDTH = '1.5';

/**
 * Connect the menu state to SVG highlighting.
 * Builds element maps from the SVG, then subscribes to state changes.
 *
 * @param {SVGElement} svgEl
 * @param {Object} state - The menu state from createMenuState()
 * @param {Object} edgeSvgIdMap - edge key -> array of SVG element IDs
 * @param {Object} structure - data-navigator structure
 * @param {SVGCircleElement} indicatorEl - the focus indicator circle
 * @returns {Function} unsubscribe function
 */
export function connectStateToSvg(svgEl, state, edgeSvgIdMap, structure, indicatorEl) {
    // Build direct reference maps at setup time
    const nodeElMap = new Map();   // nodeId -> SVGElement
    const edgeElMap = new Map();   // edgeKey -> SVGElement[]
    const allGraphEls = [];        // every node/edge SVG element

    // Index circles (nodes) by their data ID
    svgEl.querySelectorAll('circle').forEach(el => {
        if (el.classList.contains('dn-inspector-focus-indicator')) return;
        const dataId = el.__data__?.id;
        if (dataId !== undefined) {
            nodeElMap.set(String(dataId), el);
            allGraphEls.push(el);
        }
    });

    // Index lines and paths (edges) by building a reverse lookup from SVG id
    const svgIdToEdgeKey = new Map();
    Object.keys(edgeSvgIdMap).forEach(edgeKey => {
        const svgIds = edgeSvgIdMap[edgeKey];
        svgIds.forEach(svgId => svgIdToEdgeKey.set(svgId, edgeKey));
    });

    svgEl.querySelectorAll('line, path').forEach(el => {
        if (!el.id) return;
        const edgeKey = svgIdToEdgeKey.get(el.id);
        if (edgeKey !== undefined) {
            if (!edgeElMap.has(edgeKey)) edgeElMap.set(edgeKey, []);
            edgeElMap.get(edgeKey).push(el);
        }
        allGraphEls.push(el);
    });

    // Store original stroke-widths for edges so we can restore after hover
    const originalStrokeWidths = new Map();
    allGraphEls.forEach(el => {
        if (el.tagName === 'line' || el.tagName === 'path') {
            originalStrokeWidths.set(el, el.getAttribute('stroke-width') || '');
        }
    });

    // --- Dynamic edge management for edges with no pre-rendered SVG elements ---
    // These are edges (like "exit") that connect to many nodes but are excluded
    // from the graph to reduce noise. We draw them on-demand when selected/hovered.
    //
    // For function-based edges (source/target are functions), we find all nodes
    // that reference the edge in their `edges` array, plus any pseudo-nodes (SVG
    // nodes not in structure.nodes, e.g. "exit" from nodeInclusions). Lines are
    // drawn from each referencing node to each pseudo-node.
    const dynamicEdgeEls = new Map(); // edgeKey -> SVGLineElement[]

    // Identify pseudo-nodes: present in SVG (nodeElMap) but not in structure.nodes
    const pseudoNodeIds = new Set();
    nodeElMap.forEach((_, nodeId) => {
        if (!structure.nodes[nodeId]) pseudoNodeIds.add(nodeId);
    });

    /**
     * Check if an edge has no pre-rendered SVG elements.
     */
    function isVirtualEdge(edgeKey) {
        return !edgeElMap.has(edgeKey) || edgeElMap.get(edgeKey).length === 0;
    }

    /**
     * Insert a dynamic SVG line element before circles (so edges appear behind nodes).
     */
    function insertDynamicLine(x1, y1, x2, y2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', DYNAMIC_EDGE_STROKE);
        line.setAttribute('stroke-width', DYNAMIC_EDGE_STROKE_WIDTH);
        line.classList.add('dn-inspector-dynamic-edge');

        // Insert into the same parent as the first circle so it renders behind nodes.
        // Circles may be nested in <g> groups, so we insert into the circle's parent.
        const firstCircle = svgEl.querySelector('circle');
        if (firstCircle && firstCircle.parentNode) {
            firstCircle.parentNode.insertBefore(line, firstCircle);
        } else {
            svgEl.appendChild(line);
        }

        allGraphEls.push(line);
        originalStrokeWidths.set(line, DYNAMIC_EDGE_STROKE_WIDTH);
        return line;
    }

    /**
     * Create dynamic SVG lines for a virtual edge.
     *
     * - If source and target are both static strings: draw one line between them.
     * - If source or target (or both) are functions: find all nodes that reference
     *   this edge in their `node.edges` array, and draw lines from each such node
     *   to each pseudo-node (nodes in the SVG but not in structure.nodes).
     *
     * Returns the array of created line elements.
     */
    function createDynamicEdges(edgeKey) {
        if (dynamicEdgeEls.has(edgeKey)) return dynamicEdgeEls.get(edgeKey);

        const edge = structure.edges[edgeKey];
        if (!edge) return [];
        const src = typeof edge.source === 'function' ? null : edge.source;
        const tgt = typeof edge.target === 'function' ? null : edge.target;

        const lines = [];

        if (src && tgt) {
            // Both endpoints are static strings
            const srcEl = nodeElMap.get(String(src));
            const tgtEl = nodeElMap.get(String(tgt));
            if (srcEl && tgtEl) {
                lines.push(insertDynamicLine(
                    srcEl.getAttribute('cx'), srcEl.getAttribute('cy'),
                    tgtEl.getAttribute('cx'), tgtEl.getAttribute('cy')
                ));
            }
        } else {
            // At least one endpoint is a function — find connected nodes
            // by scanning which nodes have this edgeKey in their edges array
            const connectedNodeIds = [];
            Object.keys(structure.nodes).forEach(nodeId => {
                const node = structure.nodes[nodeId];
                if (node.edges && node.edges.includes(edgeKey)) {
                    connectedNodeIds.push(nodeId);
                }
            });

            if (src) {
                // Source is static, target is function: draw from each connected node to source
                const srcEl = nodeElMap.get(String(src));
                if (srcEl) {
                    connectedNodeIds.forEach(nodeId => {
                        if (nodeId === src) return;
                        const nodeEl = nodeElMap.get(String(nodeId));
                        if (nodeEl) {
                            lines.push(insertDynamicLine(
                                nodeEl.getAttribute('cx'), nodeEl.getAttribute('cy'),
                                srcEl.getAttribute('cx'), srcEl.getAttribute('cy')
                            ));
                        }
                    });
                }
            } else if (tgt) {
                // Target is static, source is function: draw from each connected node to target
                const tgtEl = nodeElMap.get(String(tgt));
                if (tgtEl) {
                    connectedNodeIds.forEach(nodeId => {
                        if (nodeId === tgt) return;
                        const nodeEl = nodeElMap.get(String(nodeId));
                        if (nodeEl) {
                            lines.push(insertDynamicLine(
                                nodeEl.getAttribute('cx'), nodeEl.getAttribute('cy'),
                                tgtEl.getAttribute('cx'), tgtEl.getAttribute('cy')
                            ));
                        }
                    });
                }
            } else {
                // Both are functions: draw from each connected node to each pseudo-node
                pseudoNodeIds.forEach(pseudoId => {
                    const pseudoEl = nodeElMap.get(pseudoId);
                    if (!pseudoEl) return;
                    connectedNodeIds.forEach(nodeId => {
                        if (nodeId === pseudoId) return;
                        const nodeEl = nodeElMap.get(String(nodeId));
                        if (nodeEl) {
                            lines.push(insertDynamicLine(
                                nodeEl.getAttribute('cx'), nodeEl.getAttribute('cy'),
                                pseudoEl.getAttribute('cx'), pseudoEl.getAttribute('cy')
                            ));
                        }
                    });
                });
            }
        }

        if (lines.length > 0) {
            dynamicEdgeEls.set(edgeKey, lines);
        }
        return lines;
    }

    /**
     * Remove all dynamic edge lines for an edge key from the SVG.
     */
    function removeDynamicEdges(edgeKey) {
        const lines = dynamicEdgeEls.get(edgeKey);
        if (!lines) return;
        lines.forEach(line => {
            if (line.parentNode) line.parentNode.removeChild(line);
            const idx = allGraphEls.indexOf(line);
            if (idx !== -1) allGraphEls.splice(idx, 1);
            originalStrokeWidths.delete(line);
        });
        dynamicEdgeEls.delete(edgeKey);
    }

    /**
     * Remove all dynamic edges that are no longer checked or hovered.
     */
    function cleanupDynamicEdges() {
        const checkedEdgeKeys = new Set();
        state.getChecked().forEach(({ type, id }) => {
            if (type === 'edge') checkedEdgeKeys.add(id);
        });
        const hovered = state.hoveredItem;
        const hoveredEdgeKey = hovered && hovered.type === 'edge' ? hovered.id : null;

        // Iterate over a copy of keys since we mutate during iteration
        [...dynamicEdgeEls.keys()].forEach(edgeKey => {
            if (!checkedEdgeKeys.has(edgeKey) && edgeKey !== hoveredEdgeKey) {
                removeDynamicEdges(edgeKey);
            }
        });
    }

    /**
     * Ensure dynamic edges exist for all checked virtual edges.
     */
    function ensureDynamicEdgesForChecked() {
        state.getChecked().forEach(({ type, id }) => {
            if (type === 'edge' && isVirtualEdge(id)) {
                createDynamicEdges(id);
            }
        });
    }

    /**
     * Resolve a checked/hovered item to its SVG elements.
     * For virtual edges, creates dynamic lines on-the-fly.
     */
    function resolveElements(type, id) {
        if (type === 'node') {
            const el = nodeElMap.get(String(id));
            return el ? [el] : [];
        }
        if (type === 'edge') {
            const existing = edgeElMap.get(id) || [];
            if (existing.length > 0) return existing;
            // Virtual edge: create dynamic lines
            return createDynamicEdges(id);
        }
        if (type === 'rule') {
            const els = [];
            Object.keys(structure.edges).forEach(edgeKey => {
                const edge = structure.edges[edgeKey];
                if (edge.navigationRules && edge.navigationRules.includes(id)) {
                    const existing = edgeElMap.get(edgeKey) || [];
                    if (existing.length > 0) {
                        existing.forEach(el => els.push(el));
                    } else {
                        // Virtual edge under this rule
                        createDynamicEdges(edgeKey).forEach(el => els.push(el));
                    }
                    // Also include connected nodes for highlighting
                    const src = typeof edge.source === 'function' ? null : edge.source;
                    const tgt = typeof edge.target === 'function' ? null : edge.target;
                    if (src) { const el = nodeElMap.get(String(src)); if (el) els.push(el); }
                    if (tgt) { const el = nodeElMap.get(String(tgt)); if (el) els.push(el); }
                    // For function-based edges, include all nodes that reference this edge
                    if (!src || !tgt) {
                        Object.keys(structure.nodes).forEach(nodeId => {
                            const node = structure.nodes[nodeId];
                            if (node.edges && node.edges.includes(edgeKey)) {
                                const el = nodeElMap.get(String(nodeId));
                                if (el) els.push(el);
                            }
                        });
                        // Include pseudo-nodes too
                        pseudoNodeIds.forEach(pid => {
                            const el = nodeElMap.get(pid);
                            if (el) els.push(el);
                        });
                    }
                }
            });
            return [...new Set(els)];
        }
        return [];
    }

    /**
     * Collect all SVG elements for all currently-checked items.
     */
    function getSelectedElements() {
        const set = new Set();
        state.getChecked().forEach(({ type, id }) => {
            resolveElements(type, id).forEach(el => set.add(el));
        });
        return set;
    }

    /**
     * Dim all graph elements except the given set (which stay full opacity).
     */
    function dimAllExcept(keepSet) {
        allGraphEls.forEach(el => {
            el.style.opacity = keepSet.has(el) ? FULL_OPACITY : DIMMED_OPACITY;
            el.style.transition = 'opacity 0.15s ease';
        });
    }

    /**
     * Clear all inline opacity and stroke overrides.
     */
    function clearAll() {
        allGraphEls.forEach(el => {
            el.style.opacity = FULL_OPACITY;
            el.style.transition = '';
            el.style.stroke = '';
            el.style.strokeWidth = '';
        });
    }

    /**
     * Apply selection state: dim everything except selected elements.
     * Selected edges get thickened stroke and dark color.
     */
    function applySelection(selectedEls) {
        allGraphEls.forEach(el => {
            el.style.transition = 'opacity 0.15s ease';
            if (selectedEls.has(el)) {
                el.style.opacity = FULL_OPACITY;
                if (el.tagName === 'line' || el.tagName === 'path') {
                    el.style.stroke = SELECTED_EDGE_STROKE;
                    el.style.strokeWidth = SELECTED_EDGE_WIDTH;
                } else if (el.tagName === 'circle') {
                    el.style.stroke = SELECTED_NODE_STROKE;
                    el.style.strokeWidth = SELECTED_NODE_STROKE_WIDTH;
                }
            } else {
                el.style.opacity = DIMMED_OPACITY;
                if (el.tagName === 'line' || el.tagName === 'path') {
                    el.style.stroke = '';
                    el.style.strokeWidth = '';
                } else if (el.tagName === 'circle') {
                    el.style.stroke = '';
                    el.style.strokeWidth = '';
                }
            }
        });
    }

    return state.subscribe((changeType, payload) => {
        if (changeType === 'check' || changeType === 'uncheck') {
            // Ensure dynamic edges exist for newly checked virtual edges
            ensureDynamicEdgesForChecked();
            // Remove dynamic edges that are no longer needed
            cleanupDynamicEdges();
        }

        const selectedEls = getSelectedElements();
        const hasChecked = state.hasAnyChecked();

        if (changeType === 'check' || changeType === 'uncheck') {
            if (hasChecked) {
                applySelection(selectedEls);
            } else {
                clearAll();
            }
        }

        if (changeType === 'hover') {
            const { type, id } = payload;
            const hoveredEls = new Set(resolveElements(type, id));

            if (!hasChecked) {
                // Nothing checked: dim everything except hovered
                dimAllExcept(hoveredEls);
            } else {
                // Items are checked: keep selection dimming, but ensure hovered items are visible
                allGraphEls.forEach(el => {
                    el.style.transition = 'opacity 0.15s ease';
                    if (hoveredEls.has(el) || selectedEls.has(el)) {
                        el.style.opacity = FULL_OPACITY;
                    } else {
                        el.style.opacity = DIMMED_OPACITY;
                    }
                });
            }

            // Thicken and darken hovered edges
            hoveredEls.forEach(el => {
                if (el.tagName === 'line' || el.tagName === 'path') {
                    el.style.strokeWidth = HOVER_STROKE_WIDTH;
                    el.style.stroke = SELECTED_EDGE_STROKE;
                }
            });

            // Move focus indicator to hovered node
            if (type === 'node') {
                const target = nodeElMap.get(String(id));
                if (target && indicatorEl) {
                    indicatorEl.setAttribute('cx', target.getAttribute('cx'));
                    indicatorEl.setAttribute('cy', target.getAttribute('cy'));
                    indicatorEl.classList.remove('dn-inspector-hidden');
                }
            }
        }

        if (changeType === 'unhover') {
            // Remove dynamic edges that were only shown for hover
            cleanupDynamicEdges();

            // Restore stroke widths and colors
            originalStrokeWidths.forEach((orig, el) => {
                el.style.strokeWidth = '';
                el.style.stroke = '';
            });

            if (hasChecked) {
                applySelection(selectedEls);
            } else {
                clearAll();
            }

            if (indicatorEl) {
                indicatorEl.classList.add('dn-inspector-hidden');
            }
        }
    });
}
