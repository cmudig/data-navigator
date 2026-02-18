/**
 * Console menu orchestrator.
 * Creates the menu DOM, wires shared state to SVG highlighting and events.
 *
 * Layout:
 *   1. Console (collapsed, at top, with clear button)
 *   2. Rendered Elements (open)
 *      - Nodes (grouped by dimension > division, then All Nodes)
 *      - Edges (grouped by nav rule, then All Edges)
 *   3. Source Input (collapsed)
 *      - Data, Props, Dimensions, Divisions
 */

import { createMenuState } from './menu-state.js';
import { connectStateToSvg } from './svg-highlight.js';
import {
    buildConsoleSection,
    buildRenderedElementsSection,
    buildSourceInputSection
} from './menu-sections.js';

/**
 * Create and mount the console menu.
 *
 * @param {Object} opts
 * @param {Object} opts.structure - The data-navigator structure
 * @param {SVGElement} opts.svgEl - The inspector SVG element
 * @param {HTMLElement} opts.container - The root container (for event dispatching)
 * @param {HTMLElement} opts.wrapperEl - The .dn-inspector-wrapper element
 * @param {Object} opts.showConsoleMenu - The showConsoleMenu prop value
 * @param {SVGCircleElement} opts.indicatorEl - The focus indicator circle
 * @param {Object} opts.edgeSvgIdMap - edge key -> array of SVG element IDs
 * @param {Function} opts.buildLabelFn - The buildLabel function for node labels
 * @returns {{ state: Object, menuEl: HTMLElement, destroy: Function }}
 */
export function createConsoleMenu({
    structure,
    svgEl,
    container,
    wrapperEl,
    showConsoleMenu,
    indicatorEl,
    edgeSvgIdMap,
    buildLabelFn
}) {
    const state = createMenuState();

    const menuEl = document.createElement('div');
    menuEl.className = 'dn-inspector-menu';

    // 1. Console (collapsed, at top with clear button)
    const { element: consoleEl, listEl: consoleListEl } = buildConsoleSection();
    menuEl.appendChild(consoleEl);

    // 2. Rendered Elements (Nodes grouped by dim/div, Edges grouped by nav rule)
    const renderedEl = buildRenderedElementsSection(
        structure, state, container, consoleListEl, buildLabelFn
    );
    menuEl.appendChild(renderedEl);

    // 3. Source Input (Data, Props, Dimensions, Divisions)
    const sourceInputEl = buildSourceInputSection(structure, showConsoleMenu);
    menuEl.appendChild(sourceInputEl);

    // Mount
    wrapperEl.appendChild(menuEl);

    // Wire state to SVG highlighting
    const unsubSvg = connectStateToSvg(svgEl, state, edgeSvgIdMap, structure, indicatorEl);

    return {
        state,
        menuEl,
        destroy() {
            unsubSvg();
            wrapperEl.removeChild(menuEl);
        }
    };
}
