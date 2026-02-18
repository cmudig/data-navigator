/**
 * Builders for each section of the console menu.
 * Each function returns an HTMLElement to be appended to the menu.
 */

import { EVENTS, dispatch } from './menu-events.js';

// ---------------------------------------------------------------------------
// Utility: collapsible section with caret indicator
// ---------------------------------------------------------------------------

/**
 * Create a <details> with a compact caret-styled <summary>.
 */
function makeDetails(summaryText, opts = {}) {
    const details = document.createElement('details');
    if (opts.className) details.className = opts.className;
    if (opts.open) details.open = true;

    const summary = document.createElement('summary');
    summary.className = 'dn-menu-summary' + (opts.summaryClass ? ' ' + opts.summaryClass : '');
    summary.textContent = summaryText;
    details.appendChild(summary);

    return details;
}

/**
 * Create a <details> with a group checkbox in the <summary>.
 * The checkbox checks/unchecks all child items and syncs bidirectionally.
 *
 * @param {string} summaryText - Label text for the summary
 * @param {Array<{type: string, id: string}>} childItems - Items this group controls
 * @param {Object} state - The menu state object
 * @param {HTMLElement} container - Container for event dispatching
 * @param {Object} [opts] - Options passed to details (className, open, summaryClass)
 * @returns {HTMLDetailsElement}
 */
function makeGroupDetails(summaryText, childItems, state, container, opts = {}) {
    const details = document.createElement('details');
    if (opts.className) details.className = opts.className;
    if (opts.open) details.open = true;

    const summary = document.createElement('summary');
    summary.className = 'dn-menu-summary' + (opts.summaryClass ? ' ' + opts.summaryClass : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'dn-menu-group-checkbox';
    checkbox.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't toggle <details> when clicking checkbox
    });
    checkbox.addEventListener('change', () => {
        const shouldCheck = checkbox.checked;
        childItems.forEach(item => {
            if (shouldCheck) {
                state.check(item.type, item.id);
            } else {
                state.uncheck(item.type, item.id);
            }
        });
        const allChecked = state.getChecked();
        dispatch(container, EVENTS.SELECTION_CHANGE, { checked: allChecked });
    });
    summary.appendChild(checkbox);

    const labelSpan = document.createElement('span');
    labelSpan.textContent = summaryText;
    summary.appendChild(labelSpan);

    details.appendChild(summary);

    // Sync checkbox state when child items change
    function syncGroupCheckbox() {
        const checkedCount = childItems.filter(item => state.isChecked(item.type, item.id)).length;
        checkbox.checked = checkedCount === childItems.length && childItems.length > 0;
        checkbox.indeterminate = checkedCount > 0 && checkedCount < childItems.length;
    }

    const unsub = state.subscribe((changeType) => {
        if (changeType === 'check' || changeType === 'uncheck') {
            syncGroupCheckbox();
        }
    });
    details._unsub = unsub;

    return details;
}

// ---------------------------------------------------------------------------
// Utility: inline expandable array  "label: [...](N)"
// ---------------------------------------------------------------------------

/**
 * Create an inline expandable array display.
 * Collapsed: "label: [...](N)"
 * Expanded: "label: [item1, item2, item3]"   (inline, no new lines)
 * Each item is interactive (hoverable via state).
 */
function buildInlineArray({ label, items, state, container, structure }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'dn-menu-inline-array';

    const toggle = document.createElement('span');
    toggle.className = 'dn-menu-array-toggle';
    toggle.textContent = label + ': ';
    wrapper.appendChild(toggle);

    const collapsed = document.createElement('span');
    collapsed.className = 'dn-menu-array-collapsed';
    collapsed.textContent = '[...](' + items.length + ')';
    wrapper.appendChild(collapsed);

    const expanded = document.createElement('span');
    expanded.className = 'dn-menu-array-expanded dn-menu-hidden';
    expanded.textContent = '[';

    items.forEach((item, i) => {
        const chip = document.createElement('span');
        chip.className = 'dn-menu-array-chip';
        chip.textContent = item.label;
        chip.dataset.type = item.type;
        chip.dataset.id = item.id;

        chip.addEventListener('mouseenter', () => {
            state.setHover(item.type, item.id);
            dispatch(container, EVENTS.ITEM_HOVER, {
                type: item.type, id: item.id,
                sourceData: getSourceData(item.type, item.id, structure)
            });
        });
        chip.addEventListener('mouseleave', () => {
            state.clearHover();
            dispatch(container, EVENTS.ITEM_UNHOVER, { type: item.type, id: item.id });
        });

        expanded.appendChild(chip);
        if (i < items.length - 1) {
            expanded.appendChild(document.createTextNode(', '));
        }
    });

    expanded.appendChild(document.createTextNode(']'));
    wrapper.appendChild(expanded);

    const toggleFn = () => {
        const isCollapsed = !collapsed.classList.contains('dn-menu-hidden');
        collapsed.classList.toggle('dn-menu-hidden', isCollapsed);
        expanded.classList.toggle('dn-menu-hidden', !isCollapsed);
    };
    collapsed.addEventListener('click', toggleFn);
    toggle.addEventListener('click', toggleFn);
    toggle.style.cursor = 'pointer';
    collapsed.style.cursor = 'pointer';

    return wrapper;
}

// ---------------------------------------------------------------------------
// Shared helper: buildMenuItem
// ---------------------------------------------------------------------------

/**
 * Creates a menu item row with checkbox, label, and optional "log" button.
 */
export function buildMenuItem({ type, id, label, state, container, showLog, logFn, consoleListEl, structure }) {
    const row = document.createElement('div');
    row.className = 'dn-menu-item';
    row.dataset.type = type;
    row.dataset.id = id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = state.isChecked(type, id);
    checkbox.addEventListener('change', () => {
        state.toggle(type, id);
        const allChecked = state.getChecked();
        if (state.isChecked(type, id)) {
            dispatch(container, EVENTS.ITEM_CHECK, { type, id, allChecked });
        } else {
            dispatch(container, EVENTS.ITEM_UNCHECK, { type, id, allChecked });
        }
        dispatch(container, EVENTS.SELECTION_CHANGE, { checked: allChecked });
    });
    row.appendChild(checkbox);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'dn-menu-item-label';
    labelSpan.textContent = label;
    row.appendChild(labelSpan);

    if (showLog && logFn) {
        const logBtn = document.createElement('button');
        logBtn.className = 'dn-menu-log-btn';
        logBtn.textContent = 'log';
        logBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const result = logFn();
            if (result && consoleListEl) {
                const consoleDetails = consoleListEl.closest('details');
                if (consoleDetails) consoleDetails.open = true;
                appendConsoleLogGroup(result, state, container, consoleListEl, structure);
                dispatch(container, EVENTS.ITEM_LOG, {
                    type: result.mainEntry.type,
                    id: result.mainEntry.id,
                    loggedData: result.mainEntry.data
                });
            }
        });
        row.appendChild(logBtn);
    }

    row.addEventListener('mouseenter', () => {
        state.setHover(type, id);
        dispatch(container, EVENTS.ITEM_HOVER, {
            type, id, sourceData: getSourceData(type, id, structure)
        });
    });
    row.addEventListener('mouseleave', () => {
        state.clearHover();
        dispatch(container, EVENTS.ITEM_UNHOVER, { type, id });
    });

    const unsub = state.subscribe((changeType, payload) => {
        if ((changeType === 'check' || changeType === 'uncheck') &&
            payload.type === type && payload.id === id) {
            checkbox.checked = state.isChecked(type, id);
        }
    });
    row._unsub = unsub;

    return row;
}

function getSourceData(type, id, structure) {
    if (!structure) return null;
    if (type === 'node') return structure.nodes[id] || null;
    if (type === 'edge') return structure.edges[id] || null;
    if (type === 'rule') return structure.navigationRules?.[id] || null;
    return null;
}

// ---------------------------------------------------------------------------
// Console log rendering (with inline expandable arrays)
// ---------------------------------------------------------------------------

function appendConsoleLogGroup(result, state, container, consoleListEl, structure) {
    const { mainEntry, relatedArrays } = result;

    const mainRow = buildMenuItem({
        type: mainEntry.type,
        id: mainEntry.id,
        label: mainEntry.label,
        state, container, showLog: false, structure
    });
    mainRow.classList.add('dn-menu-console-entry');
    consoleListEl.appendChild(mainRow);

    state.addLogEntry(mainEntry);

    if (relatedArrays) {
        relatedArrays.forEach(arr => {
            const inlineEl = buildInlineArray({
                label: arr.label,
                items: arr.items,
                state, container, structure
            });
            inlineEl.classList.add('dn-menu-console-entry');
            inlineEl.style.paddingLeft = '24px';
            consoleListEl.appendChild(inlineEl);
        });
    }

    consoleListEl.scrollTop = consoleListEl.scrollHeight;
}

// ---------------------------------------------------------------------------
// Log functions: return { mainEntry, relatedArrays }
// ---------------------------------------------------------------------------

function buildNodeLogResult(nodeId, structure) {
    const node = structure.nodes[nodeId];
    if (!node) return null;

    const edgeItems = (node.edges || [])
        .map(eId => {
            const edge = structure.edges[eId];
            if (!edge) return null;
            const src = typeof edge.source === 'function' ? '?' : edge.source;
            const tgt = typeof edge.target === 'function' ? '?' : edge.target;
            return { type: 'edge', id: eId, label: src + '\u2192' + tgt };
        })
        .filter(Boolean);

    return {
        mainEntry: {
            type: 'node', id: nodeId,
            label: 'node: ' + nodeId,
            data: node, timestamp: Date.now()
        },
        relatedArrays: edgeItems.length > 0 ? [{
            label: 'edges',
            items: edgeItems
        }] : []
    };
}

function buildEdgeLogResult(edgeKey, structure) {
    const edge = structure.edges[edgeKey];
    if (!edge) return null;

    const src = typeof edge.source === 'function' ? null : edge.source;
    const tgt = typeof edge.target === 'function' ? null : edge.target;

    const relatedArrays = [];
    if (src && structure.nodes[src]) {
        relatedArrays.push({ label: 'source', items: [{ type: 'node', id: src, label: src }] });
    }
    if (tgt && structure.nodes[tgt]) {
        relatedArrays.push({ label: 'target', items: [{ type: 'node', id: tgt, label: tgt }] });
    }

    return {
        mainEntry: {
            type: 'edge', id: edgeKey,
            label: 'edge: ' + (src || '?') + ' \u2192 ' + (tgt || '?'),
            data: edge, timestamp: Date.now()
        },
        relatedArrays
    };
}

function buildNavRuleLogResult(ruleId, structure) {
    const rule = structure.navigationRules?.[ruleId];

    const matchingEdgeItems = [];
    const matchingNodeIds = new Set();

    Object.keys(structure.edges).forEach(edgeKey => {
        const edge = structure.edges[edgeKey];
        if (edge.navigationRules && edge.navigationRules.includes(ruleId)) {
            const src = typeof edge.source === 'function' ? '?' : edge.source;
            const tgt = typeof edge.target === 'function' ? '?' : edge.target;
            matchingEdgeItems.push({ type: 'edge', id: edgeKey, label: src + '\u2192' + tgt });
            if (typeof edge.source === 'string') matchingNodeIds.add(edge.source);
            if (typeof edge.target === 'string') matchingNodeIds.add(edge.target);
        }
    });

    const matchingNodeItems = [...matchingNodeIds]
        .filter(nid => structure.nodes[nid])
        .map(nid => ({ type: 'node', id: nid, label: nid }));

    const relatedArrays = [];
    if (matchingEdgeItems.length > 0) {
        relatedArrays.push({ label: 'edges', items: matchingEdgeItems });
    }
    if (matchingNodeItems.length > 0) {
        relatedArrays.push({ label: 'nodes', items: matchingNodeItems });
    }

    return {
        mainEntry: {
            type: 'rule', id: ruleId,
            label: 'rule: ' + ruleId,
            data: rule || ruleId, timestamp: Date.now()
        },
        relatedArrays
    };
}

// ---------------------------------------------------------------------------
// Helper: build an edge menu item
// ---------------------------------------------------------------------------

function buildEdgeMenuItem(edgeKey, structure, state, container, consoleListEl) {
    const edge = structure.edges[edgeKey];
    const src = typeof edge.source === 'function' ? '(fn)' : edge.source;
    const tgt = typeof edge.target === 'function' ? '(fn)' : edge.target;
    const rules = (edge.navigationRules || []).join(',');
    const label = src + ' \u2192 ' + tgt + (rules ? ' [' + rules + ']' : '');
    return buildMenuItem({
        type: 'edge', id: edgeKey, label,
        state, container, showLog: true,
        logFn: () => buildEdgeLogResult(edgeKey, structure),
        consoleListEl, structure
    });
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

/**
 * Console section (collapsed by default, sits at top of menu).
 * Includes a "clear" button on the summary row.
 */
export function buildConsoleSection() {
    const details = document.createElement('details');
    details.className = 'dn-menu-console';

    const summary = document.createElement('summary');
    summary.className = 'dn-menu-summary dn-menu-summary-top';
    summary.textContent = 'Console';
    details.appendChild(summary);

    // Clear button (appended after the summary text, inside summary)
    const clearBtn = document.createElement('button');
    clearBtn.className = 'dn-menu-log-btn dn-menu-clear-btn';
    clearBtn.textContent = 'clear';
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        listEl.innerHTML = '';
    });
    summary.appendChild(clearBtn);

    const listEl = document.createElement('div');
    listEl.className = 'dn-menu-console-list';
    details.appendChild(listEl);

    return { element: details, listEl };
}

/**
 * Rendered Elements section with grouped Nodes and grouped Edges.
 *
 * Nodes are grouped by dimension > division, then "All Nodes" flat list.
 * Edges are grouped by navigation rule, then "All Edges" flat list.
 */
export function buildRenderedElementsSection(structure, state, container, consoleListEl, buildLabelFn) {
    const details = makeDetails('Rendered Elements', { summaryClass: 'dn-menu-summary-top' });

    // --- Nodes ---
    const allNodeKeys = Object.keys(structure.nodes || {});
    const nodesDetails = makeDetails('Nodes (' + allNodeKeys.length + ')');

    // Group nodes by dimension > division
    if (structure.dimensions) {
        const dimKeys = Object.keys(structure.dimensions);
        dimKeys.forEach(dimKey => {
            const dim = structure.dimensions[dimKey];
            const dimNode = structure.nodes[dim.nodeId];
            const divIds = Object.keys(dim.divisions || {});

            // Collect all node IDs in this dimension for the group checkbox
            const dimChildItems = [];
            if (dimNode) dimChildItems.push({ type: 'node', id: dim.nodeId });
            divIds.forEach(divId => {
                const div = dim.divisions[divId];
                const divNodeId = findDivisionNodeId(structure, dimKey, divId);
                if (divNodeId) dimChildItems.push({ type: 'node', id: divNodeId });
                Object.keys(div.values || {}).forEach(leafId => {
                    if (structure.nodes[leafId]) dimChildItems.push({ type: 'node', id: leafId });
                });
            });

            // Dimension-level details with group checkbox
            const dimDetails = makeGroupDetails(
                dimKey + ' (' + dim.type + ', ' + divIds.length + ' div' + (divIds.length !== 1 ? 's' : '') + ')',
                dimChildItems, state, container
            );

            // The dimension node itself
            if (dimNode) {
                dimDetails.appendChild(buildMenuItem({
                    type: 'node', id: dim.nodeId,
                    label: dim.nodeId + ' (dimension)',
                    state, container, showLog: true,
                    logFn: () => buildNodeLogResult(dim.nodeId, structure),
                    consoleListEl, structure
                }));
            }

            // Each division
            divIds.forEach(divId => {
                const div = dim.divisions[divId];
                const leafIds = Object.keys(div.values || {});

                // Collect node IDs in this division for the group checkbox
                const divChildItems = [];
                const divNodeId = findDivisionNodeId(structure, dimKey, divId);
                if (divNodeId) divChildItems.push({ type: 'node', id: divNodeId });
                leafIds.forEach(leafId => {
                    if (structure.nodes[leafId]) divChildItems.push({ type: 'node', id: leafId });
                });

                const divDetails = makeGroupDetails(
                    divId + ' (' + leafIds.length + ' item' + (leafIds.length !== 1 ? 's' : '') + ')',
                    divChildItems, state, container
                );

                // Division node itself
                if (divNodeId) {
                    divDetails.appendChild(buildMenuItem({
                        type: 'node', id: divNodeId,
                        label: divNodeId + ' (division)',
                        state, container, showLog: true,
                        logFn: () => buildNodeLogResult(divNodeId, structure),
                        consoleListEl, structure
                    }));
                }

                // Leaf nodes in this division
                leafIds.forEach(leafId => {
                    const node = structure.nodes[leafId];
                    if (!node) return;
                    const desc = buildLabelFn ? buildLabelFn(node) : leafId;
                    const label = leafId + (desc !== leafId ? ' \u2014 ' + truncate(desc, 30) : '');
                    divDetails.appendChild(buildMenuItem({
                        type: 'node', id: leafId, label,
                        state, container, showLog: true,
                        logFn: () => buildNodeLogResult(leafId, structure),
                        consoleListEl, structure
                    }));
                });

                dimDetails.appendChild(divDetails);
            });

            nodesDetails.appendChild(dimDetails);
        });
    }

    // All Nodes flat list
    const allNodesDetails = makeDetails('All Nodes (' + allNodeKeys.length + ')');
    allNodeKeys.forEach(nodeId => {
        const node = structure.nodes[nodeId];
        const desc = buildLabelFn ? buildLabelFn(node) : nodeId;
        const label = nodeId + (desc !== nodeId ? ' \u2014 ' + truncate(desc, 30) : '');
        allNodesDetails.appendChild(buildMenuItem({
            type: 'node', id: nodeId, label,
            state, container, showLog: true,
            logFn: () => buildNodeLogResult(nodeId, structure),
            consoleListEl, structure
        }));
    });
    nodesDetails.appendChild(allNodesDetails);

    details.appendChild(nodesDetails);

    // --- Edges ---
    const allEdgeKeys = Object.keys(structure.edges || {});
    const edgesDetails = makeDetails('Edges (' + allEdgeKeys.length + ')');

    // Group edges by navigation rule
    const ruleToEdges = new Map();
    allEdgeKeys.forEach(edgeKey => {
        const edge = structure.edges[edgeKey];
        const rules = edge.navigationRules || [];
        rules.forEach(rule => {
            if (!ruleToEdges.has(rule)) ruleToEdges.set(rule, []);
            ruleToEdges.get(rule).push(edgeKey);
        });
    });

    // Sort rule names for consistent ordering
    const sortedRules = [...ruleToEdges.keys()].sort();
    sortedRules.forEach(rule => {
        const edgeKeysForRule = ruleToEdges.get(rule);
        const ruleChildItems = edgeKeysForRule.map(edgeKey => ({ type: 'edge', id: edgeKey }));
        const ruleDetails = makeGroupDetails(
            rule + ' (' + edgeKeysForRule.length + ')',
            ruleChildItems, state, container
        );

        edgeKeysForRule.forEach(edgeKey => {
            ruleDetails.appendChild(buildEdgeMenuItem(edgeKey, structure, state, container, consoleListEl));
        });

        edgesDetails.appendChild(ruleDetails);
    });

    // All Edges flat list
    const allEdgesDetails = makeDetails('All Edges (' + allEdgeKeys.length + ')');
    allEdgeKeys.forEach(edgeKey => {
        allEdgesDetails.appendChild(buildEdgeMenuItem(edgeKey, structure, state, container, consoleListEl));
    });
    edgesDetails.appendChild(allEdgesDetails);

    details.appendChild(edgesDetails);

    return details;
}

/**
 * Find the node ID for a division node given dimension key and division ID.
 */
function findDivisionNodeId(structure, dimKey, divId) {
    // Division nodes have derivedNode === dimKey and data[dimKey] matching
    const nodeKeys = Object.keys(structure.nodes);
    for (let i = 0; i < nodeKeys.length; i++) {
        const node = structure.nodes[nodeKeys[i]];
        if (node.derivedNode === dimKey && node.dimensionLevel === 2) {
            // Check if this node's data value matches divId
            if (node.data && node.data[dimKey] !== undefined && String(node.data[dimKey]) === String(divId)) {
                return nodeKeys[i];
            }
            // Also check by ID pattern — sometimes the node ID is the divId itself
            if (nodeKeys[i] === divId) {
                return divId;
            }
        }
    }
    return null;
}

/**
 * Source Input section: wraps Data, Props, Dimensions, Divisions.
 * (Console is now separate at top; nav rules are grouped under Edges)
 */
export function buildSourceInputSection(structure, showConsoleMenu) {
    const details = makeDetails('Source Input', { summaryClass: 'dn-menu-summary-top' });

    // Data
    if (showConsoleMenu.data) {
        details.appendChild(buildDataSection(showConsoleMenu.data));
    }

    // Props
    const propsEl = buildPropsSection({
        structure: showConsoleMenu.structure,
        input: showConsoleMenu.input,
        rendering: showConsoleMenu.rendering
    });
    if (propsEl) details.appendChild(propsEl);

    // Dimensions
    details.appendChild(buildDimensionsSection(structure.dimensions));

    // Divisions
    details.appendChild(buildDivisionsSection(structure.dimensions));

    return details;
}

// ---------------------------------------------------------------------------
// Simple section builders (Data, Props, Dimensions, Divisions)
// ---------------------------------------------------------------------------

function buildDataSection(data) {
    const count = Array.isArray(data) ? data.length + ' items' : 'object';
    const details = makeDetails('Data (' + count + ')');

    const pre = document.createElement('pre');
    pre.className = 'dn-menu-pre';
    const code = document.createElement('code');
    code.textContent = JSON.stringify(data, null, 2);
    pre.appendChild(code);
    details.appendChild(pre);

    return details;
}

function buildPropsSection(propsConfig) {
    const { structure: s, input: i, rendering: r } = propsConfig;
    if (!s && !i && !r) return null;

    const details = makeDetails('Props');

    if (s) {
        const sub = makeDetails('structure');
        const pre = document.createElement('pre');
        pre.className = 'dn-menu-pre';
        pre.textContent = JSON.stringify(s, null, 2);
        sub.appendChild(pre);
        details.appendChild(sub);
    }
    if (i) {
        const sub = makeDetails('input');
        const pre = document.createElement('pre');
        pre.className = 'dn-menu-pre';
        pre.textContent = JSON.stringify(i, null, 2);
        sub.appendChild(pre);
        details.appendChild(sub);
    }
    if (r) {
        const sub = makeDetails('rendering');
        const pre = document.createElement('pre');
        pre.className = 'dn-menu-pre';
        pre.textContent = JSON.stringify(r, null, 2);
        sub.appendChild(pre);
        details.appendChild(sub);
    }

    return details;
}

function buildDimensionsSection(dimensions) {
    const dimKeys = dimensions ? Object.keys(dimensions) : [];
    const details = makeDetails('Dimensions (' + dimKeys.length + ')');

    dimKeys.forEach(key => {
        const dim = dimensions[key];
        const divCount = Object.keys(dim.divisions || {}).length;
        const item = document.createElement('div');
        item.className = 'dn-menu-info';
        item.textContent = key + ' (' + dim.type + ', ' + divCount + ' div' + (divCount !== 1 ? 's' : '') + ')';
        details.appendChild(item);
    });

    if (dimKeys.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dn-menu-info dn-menu-empty';
        empty.textContent = '(none)';
        details.appendChild(empty);
    }

    return details;
}

function buildDivisionsSection(dimensions) {
    const allDivisions = [];
    if (dimensions) {
        Object.keys(dimensions).forEach(dimKey => {
            const dim = dimensions[dimKey];
            Object.keys(dim.divisions || {}).forEach(divId => {
                const div = dim.divisions[divId];
                const count = Object.keys(div.values || {}).length;
                allDivisions.push({ dimKey, divId, count });
            });
        });
    }

    const details = makeDetails('Divisions (' + allDivisions.length + ')');

    allDivisions.forEach(({ dimKey, divId, count }) => {
        const item = document.createElement('div');
        item.className = 'dn-menu-info';
        item.textContent = dimKey + ': ' + divId + ' (' + count + ')';
        details.appendChild(item);
    });

    if (allDivisions.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dn-menu-info dn-menu-empty';
        empty.textContent = '(none)';
        details.appendChild(empty);
    }

    return details;
}

function truncate(str, max) {
    if (str.length <= max) return str;
    return str.slice(0, max - 1) + '\u2026';
}
