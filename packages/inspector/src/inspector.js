import { ForceGraph } from './force-graph.js';
import { TreeGraph } from './tree-graph.js';

/**
 * Converts a structure's nodes or edges object into an array for D3.
 * Optionally includes extra node IDs or excludes certain edge IDs.
 */
const convertToArray = (obj, include, exclude) => {
    let arr = [];
    if (include) {
        include.forEach(id => {
            arr.push({ id });
        });
    }
    Object.keys(obj).forEach(k => {
        if (exclude && exclude.indexOf(k) !== -1) {
            return;
        }
        arr.push(obj[k]);
    });
    return arr;
};

/**
 * Builds a tooltip label for a structure node.
 */
export const buildLabel = (node, colorBy) => {
    if (node.semantics?.label) return node.semantics.label;
    if (!node.derivedNode) {
        if (node.data) {
            return (
                Object.keys(node.data)
                    .map(key => `${key}: ${node.data[key]}`)
                    .join('. ') + '. Data point.'
            );
        }
        return node.id;
    }
    if (node.data?.dimensionKey) {
        let count = 0;
        let divisions = Object.keys(node.data.divisions || {});
        divisions.forEach(div => {
            count += Object.keys(node.data.divisions[div].values || {}).length;
        });
        let label = `${node.derivedNode}.`;
        label +=
            divisions.length && count
                ? ` Contains ${divisions.length} division${
                      divisions.length > 1 ? 's' : ''
                  } which contain ${count} datapoint${count > 1 ? 's' : ''} total.`
                : ' Contains no child data points.';
        label += ` ${node.data.type} dimension.`;
        return label;
    }
    return `${node.derivedNode}: ${node.data?.[node.derivedNode]}. Contains ${
        Object.keys(node.data?.values || {}).length
    } child data point${Object.keys(node.data?.values || {}).length > 1 ? 's' : ''}. Division of ${
        node.derivedNode
    } dimension.`;
};

/**
 * Shows the tooltip next to the force graph.
 */
const showTooltip = (node, tooltipEl, graphWidth, graphHeight, colorBy) => {
    tooltipEl.classList.remove('dn-inspector-hidden');
    tooltipEl.innerText =
        buildLabel(node, colorBy) ||
        `${node.id}${node.data?.[colorBy] ? ', ' + node.data[colorBy] : ''} (generic node, edges hidden).`;
    const bbox = tooltipEl.getBoundingClientRect();
    const yOffset = bbox.height / 2;
    tooltipEl.style.textAlign = 'left';
    tooltipEl.style.transform = `translate(${graphWidth}px,${graphHeight / 2 - yOffset}px)`;
};

/**
 * Hides the tooltip and optionally the focus indicator.
 */
const hideTooltip = (tooltipEl, indicatorEl) => {
    tooltipEl.classList.add('dn-inspector-hidden');
    if (indicatorEl) {
        indicatorEl.classList.add('dn-inspector-hidden');
    }
};

/**
 * Moves the SVG focus indicator circle to the target node.
 */
const highlightNode = (nodeId, svgEl, indicatorEl) => {
    let target = svgEl.querySelector('#svg' + nodeId);
    if (!target || !indicatorEl) return;
    indicatorEl.setAttribute('cx', target.getAttribute('cx'));
    indicatorEl.setAttribute('cy', target.getAttribute('cy'));
    indicatorEl.classList.remove('dn-inspector-hidden');
};

/**
 * Creates and returns a focus indicator circle element inside the SVG.
 */
const createFocusIndicator = (svgEl, id) => {
    let indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    indicator.id = id + '-focus-indicator';
    indicator.setAttribute('class', 'dn-inspector-focus-indicator dn-inspector-hidden');
    indicator.setAttribute('cx', 0);
    indicator.setAttribute('cy', 0);
    indicator.setAttribute('r', 6.5);
    indicator.setAttribute('fill', 'none');
    indicator.setAttribute('stroke', '#000');
    indicator.setAttribute('stroke-width', '2');
    svgEl.appendChild(indicator);
    return indicator;
};

/**
 * Inspector: creates a passive force-directed graph visualization of a
 * data-navigator structure. Does not drive navigation — call highlight()
 * and clear() from your own navigation lifecycle to keep the graph in sync.
 *
 * @param {Object} options
 * @param {Object} options.structure - A data-navigator structure object (nodes, edges, navigationRules)
 * @param {string|HTMLElement} options.container - DOM element or ID to mount in
 * @param {number} [options.size=300] - Width and height of the force graph
 * @param {string} [options.colorBy='dimensionLevel'] - Field to color nodes by
 * @param {number} [options.nodeRadius=5] - Radius of node circles
 * @param {string[]} [options.edgeExclusions=[]] - Edge IDs to exclude from the graph
 * @param {string[]} [options.nodeInclusions=[]] - Extra pseudo-node IDs to include
 * @param {'force'|'tree'} [options.mode='force'] - Visualization mode: 'force' for force-directed, 'tree' for hierarchy layout
 *
 * @returns {{ svg: SVGElement, highlight: Function, clear: Function, destroy: Function }}
 */
export function Inspector({
    structure,
    container,
    size = 300,
    colorBy = 'dimensionLevel',
    nodeRadius = 5,
    edgeExclusions = [],
    nodeInclusions = [],
    mode = 'force'
}) {
    const rootEl = typeof container === 'string' ? document.getElementById(container) : container;
    const rootId = rootEl.id || 'dn-inspector-' + Math.random().toString(36).slice(2, 8);
    if (!rootEl.id) rootEl.id = rootId;

    // Build the graph SVG
    const graphWidth = mode === 'tree' ? size * 2 : size;
    const graphHeight = mode === 'tree' ? Math.round(size * 1.5) : size;
    const nodeArray = convertToArray(structure.nodes, nodeInclusions);
    const linkArray = convertToArray(structure.edges, [], edgeExclusions);
    const graphOptions = {
        nodeId: d => d.id,
        nodeGroup: d => (colorBy === 'dimensionLevel' ? d.dimensionLevel : d.data?.[colorBy]),
        width: graphWidth,
        height: graphHeight,
        nodeRadius,
        hide: true
    };

    const graph = mode === 'tree'
        ? TreeGraph(
            { nodes: nodeArray, links: linkArray },
            { ...graphOptions, dimensions: structure.dimensions }
          )
        : ForceGraph(
            { nodes: nodeArray, links: linkArray },
            graphOptions
          );

    // Create wrapper structure
    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'dn-inspector-wrapper';
    wrapperEl.style.position = 'relative';

    const graphContainer = document.createElement('div');
    graphContainer.className = 'dn-inspector-graph';
    graphContainer.appendChild(graph);
    wrapperEl.appendChild(graphContainer);

    // Create tooltip
    const tooltipEl = document.createElement('div');
    tooltipEl.id = rootId + '-tooltip';
    tooltipEl.className = 'dn-inspector-tooltip dn-inspector-hidden';
    tooltipEl.setAttribute('role', 'presentation');
    tooltipEl.setAttribute('focusable', 'false');
    wrapperEl.appendChild(tooltipEl);

    rootEl.appendChild(wrapperEl);

    // Assign IDs to SVG circles for targeting
    const svgEl = graphContainer.querySelector('svg');
    graphContainer.querySelectorAll('circle').forEach(c => {
        if (c.__data__?.id) {
            c.id = 'svg' + c.__data__.id;
        }
        c.addEventListener('mousemove', e => {
            if (e.target?.__data__?.id) {
                let d = e.target.__data__;
                showTooltip(structure.nodes[d.id] || d, tooltipEl, graphWidth, graphHeight, colorBy);
            }
        });
        c.addEventListener('mouseleave', () => {
            hideTooltip(tooltipEl);
        });
    });

    // Create focus indicator
    const indicatorEl = createFocusIndicator(svgEl, rootId);

    // Public API
    return {
        svg: svgEl,
        highlight(nodeId) {
            highlightNode(nodeId, svgEl, indicatorEl);
            if (structure.nodes[nodeId]) {
                showTooltip(structure.nodes[nodeId], tooltipEl, graphWidth, graphHeight, colorBy);
            }
        },
        clear() {
            hideTooltip(tooltipEl, indicatorEl);
        },
        destroy() {
            rootEl.removeChild(wrapperEl);
        }
    };
}
