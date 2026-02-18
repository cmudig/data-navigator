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

    /**
     * Resolve a checked/hovered item to its SVG elements.
     */
    function resolveElements(type, id) {
        if (type === 'node') {
            const el = nodeElMap.get(String(id));
            return el ? [el] : [];
        }
        if (type === 'edge') {
            return edgeElMap.get(id) || [];
        }
        if (type === 'rule') {
            const els = [];
            Object.keys(structure.edges).forEach(edgeKey => {
                const edge = structure.edges[edgeKey];
                if (edge.navigationRules && edge.navigationRules.includes(id)) {
                    (edgeElMap.get(edgeKey) || []).forEach(el => els.push(el));
                    const src = typeof edge.source === 'function' ? null : edge.source;
                    const tgt = typeof edge.target === 'function' ? null : edge.target;
                    if (src) { const el = nodeElMap.get(String(src)); if (el) els.push(el); }
                    if (tgt) { const el = nodeElMap.get(String(tgt)); if (el) els.push(el); }
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
            el.style.strokeWidth = '';
            el.style.stroke = '';
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
                }
            } else {
                el.style.opacity = DIMMED_OPACITY;
                // Restore non-selected edges to original stroke
                if (el.tagName === 'line' || el.tagName === 'path') {
                    el.style.stroke = '';
                    el.style.strokeWidth = '';
                }
            }
        });
    }

    // Store original stroke-widths for edges so we can restore after hover
    const originalStrokeWidths = new Map();
    allGraphEls.forEach(el => {
        if (el.tagName === 'line' || el.tagName === 'path') {
            originalStrokeWidths.set(el, el.getAttribute('stroke-width') || '');
        }
    });

    return state.subscribe((changeType, payload) => {
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
