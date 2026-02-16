import { ForceGraph } from './force-graph.js';

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
 * Adds rendering properties (renderId, semantics) to structure nodes
 * so they can be used with data-navigator's rendering module.
 */
const addRenderingProperties = (nodes, rootId, size) => {
    Object.keys(nodes).forEach(k => {
        let node = nodes[k];
        if (!node.renderId) {
            node.renderId = node.id;
        }
        node.existingElement = {
            useForSpatialProperties: true,
            spatialProperties: () => {
                let el = document.getElementById(rootId)?.querySelector('#svg' + node.renderId);
                if (!el) return { x: 0, y: 0, width: 0, height: 0 };
                let box = el.getBBox();
                return {
                    x: box.x + size / 2 - 0.91,
                    y: box.y + size / 2 - 0.91,
                    width: box.width,
                    height: box.height
                };
            }
        };
        let label = '';
        if (!node.derivedNode) {
            // Leaf data point — build label from data fields
            if (node.data) {
                label = Object.keys(node.data)
                    .map(key => `${key}: ${node.data[key]}`)
                    .join('. ');
                label += '. Data point.';
            } else {
                label = node.id;
            }
        } else {
            if (node.data?.dimensionKey) {
                // Dimension node
                let count = 0;
                let divisions = Object.keys(node.data.divisions || {});
                divisions.forEach(div => {
                    count += Object.keys(node.data.divisions[div].values || {}).length;
                });
                label = `${node.derivedNode}.`;
                label +=
                    divisions.length && count
                        ? ` Contains ${divisions.length} division${
                              divisions.length > 1 ? 's' : ''
                          } which contain ${count} datapoint${count > 1 ? 's' : ''} total.`
                        : ' Contains no child data points.';
                label += ` ${node.data.type} dimension.`;
            } else {
                // Division node
                label = `${node.derivedNode}: ${node.data?.[node.derivedNode]}. Contains ${
                    Object.keys(node.data?.values || {}).length
                } child data point${Object.keys(node.data?.values || {}).length > 1 ? 's' : ''}. Division of ${
                    node.derivedNode
                } dimension.`;
            }
        }
        if (!node.semantics) {
            node.semantics = { label };
        }
    });
};

/**
 * Shows the tooltip next to the force graph.
 */
const showTooltip = (node, tooltipEl, size, colorBy) => {
    tooltipEl.classList.remove('dn-inspector-hidden');
    tooltipEl.innerText =
        node.semantics?.label ||
        `${node.id}${node.data?.[colorBy] ? ', ' + node.data[colorBy] : ''} (generic node, edges hidden).`;
    const bbox = tooltipEl.getBoundingClientRect();
    const yOffset = bbox.height / 2;
    tooltipEl.style.textAlign = 'left';
    tooltipEl.style.transform = `translate(${size}px,${size / 2 - yOffset}px)`;
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
 * Inspector: creates a force-directed graph from a data-navigator structure
 * and wires up focus synchronization with data-navigator's rendering/input modules.
 *
 * @param {Object} options
 * @param {Object} options.structure - A data-navigator structure object (nodes, edges, navigationRules)
 * @param {string|HTMLElement} options.container - DOM element or ID to mount in
 * @param {number} [options.size=300] - Width and height of the force graph
 * @param {string} [options.colorBy='dimensionLevel'] - Field to color nodes by
 * @param {string} options.entryPoint - Node ID to enter navigation at
 * @param {number} [options.nodeRadius=5] - Radius of node circles
 * @param {string[]} [options.edgeExclusions=[]] - Edge IDs to exclude from the graph
 * @param {string[]} [options.nodeInclusions=[]] - Extra pseudo-node IDs to include
 * @param {Object} options.dataNavigator - The data-navigator module (must provide .rendering() and .input())
 *
 * @returns {{ svg: SVGElement, highlight: Function, clear: Function, destroy: Function }}
 */
export function Inspector({
    structure,
    container,
    size = 300,
    colorBy = 'dimensionLevel',
    entryPoint,
    nodeRadius = 5,
    edgeExclusions = [],
    nodeInclusions = [],
    dataNavigator
}) {
    const rootEl = typeof container === 'string' ? document.getElementById(container) : container;
    const rootId = rootEl.id || 'dn-inspector-' + Math.random().toString(36).slice(2, 8);
    if (!rootEl.id) rootEl.id = rootId;

    let current = null;
    let previous = null;

    // Add rendering properties to nodes
    addRenderingProperties(structure.nodes, rootId, size);

    // Build the force graph SVG
    const graph = ForceGraph(
        {
            nodes: convertToArray(structure.nodes, nodeInclusions),
            links: convertToArray(structure.edges, [], edgeExclusions)
        },
        {
            nodeId: d => d.id,
            nodeGroup: d => (colorBy === 'dimensionLevel' ? d.dimensionLevel : d.data?.[colorBy]),
            width: size,
            height: size,
            nodeRadius,
            hide: true
        }
    );

    // Create wrapper structure
    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'dn-inspector-wrapper';
    wrapperEl.style.position = 'relative';

    const graphContainer = document.createElement('div');
    graphContainer.id = 'dn-root-' + rootId;
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
                showTooltip(structure.nodes[d.id] || d, tooltipEl, size, colorBy);
            }
        });
        c.addEventListener('mouseleave', () => {
            hideTooltip(tooltipEl);
        });
    });

    // Create focus indicator
    const indicatorEl = createFocusIndicator(svgEl, rootId);

    // Set up data-navigator rendering and input
    const exitFn = () => {
        rendering.exitElement.style.display = 'block';
        input.focus(rendering.exitElement.id);
        previous = current;
        current = null;
        rendering.remove(previous);
    };

    const rendering = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-inspector-node' },
        suffixId: 'dn-inspector-schema-' + rootId,
        root: {
            id: 'dn-root-' + rootId,
            cssClass: '',
            width: '100%',
            height: 0
        },
        entryButton: {
            include: true,
            callbacks: {
                click: () => {
                    const nextNode = input.enter();
                    if (nextNode) initiateLifecycle(nextNode);
                }
            }
        },
        exitElement: { include: true }
    });

    rendering.initialize();

    const input = dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint,
        exitPoint: rendering.exitElement.id
    });

    const move = direction => {
        const nextNode = input.move(current, direction);
        if (nextNode) initiateLifecycle(nextNode);
    };

    const initiateLifecycle = nextNode => {
        const renderedNode = rendering.render({
            renderId: nextNode.renderId,
            datum: nextNode
        });
        renderedNode.addEventListener('keydown', e => {
            const direction = input.keydownValidator(e);
            if (direction) {
                e.preventDefault();
                if (direction === 'exit') {
                    exitFn();
                } else {
                    move(direction);
                }
            }
        });
        renderedNode.addEventListener('blur', () => {
            hideTooltip(tooltipEl, indicatorEl);
        });
        renderedNode.addEventListener('focus', () => {
            showTooltip(nextNode, tooltipEl, size, colorBy);
            highlightNode(nextNode.renderId, svgEl, indicatorEl);
        });
        input.focus(nextNode.renderId);
        previous = current;
        current = nextNode.id;
        rendering.remove(previous);
    };

    // Public API
    return {
        svg: svgEl,
        highlight(nodeId) {
            highlightNode(nodeId, svgEl, indicatorEl);
            if (structure.nodes[nodeId]) {
                showTooltip(structure.nodes[nodeId], tooltipEl, size, colorBy);
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
