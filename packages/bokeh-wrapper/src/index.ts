/**
 * @data-navigator/bokeh-wrapper
 *
 * Adds accessible data navigation to Bokeh charts with minimal setup.
 * Uses the data-navigator text-chat interface by default so that the
 * broadest range of users — including screen reader users, keyboard-only
 * users, and mobile users — can explore your chart.
 */

import dataNavigator from 'data-navigator';
import type { Structure, TextChatInstance } from 'data-navigator';
import { buildStructureOptions, buildCommandLabels, buildChartDescription, prepareNodeSemantics, resolveEl } from './structure-builder';
import type { BokehWrapperOptions, BokehWrapperInstance } from './types';

export type { BokehWrapperOptions, BokehWrapperInstance, BokehChartType, BokehWrapperMode } from './types';
export { buildChartDescription, buildNodeLabel, prepareNodeSemantics } from './structure-builder';

// ─── Chat container helper ───────────────────────────────────────────────────

function resolveChatContainer(
    options: BokehWrapperOptions,
    plotEl: HTMLElement
): { el: HTMLElement; owned: boolean } {
    if (options.chatContainer) {
        const el = resolveEl(options.chatContainer);
        if (el) return { el, owned: false };
    }
    const div = document.createElement('div');
    div.className = 'dn-bokeh-wrapper';
    plotEl.parentElement?.insertBefore(div, plotEl.nextSibling) ??
        document.body.appendChild(div);
    return { el: div, owned: true };
}

// ─── Keyboard mode ───────────────────────────────────────────────────────────

function setupKeyboardMode(
    structure: Structure,
    plotEl: HTMLElement,
    options: BokehWrapperOptions
): { destroy: () => void; getCurrentNode: () => import('data-navigator').NodeObject | null } {
    const { onNavigate, onExit, renderingOptions = {} } = options;
    const width = plotEl.clientWidth || 400;
    const height = plotEl.clientHeight || 300;

    let current: string | null = null;
    let previous: string | null = null;

    const entryPoint = structure.dimensions
        ? structure.dimensions[Object.keys(structure.dimensions)[0]]?.nodeId
        : Object.keys(structure.nodes)[0];

    const suffixId = `dn-bokeh-${Math.random().toString(36).slice(2, 6)}`;

    // NOTE: In keyboard mode the keyboard navigation elements live INSIDE plotEl.
    // plotEl must NOT be inert — that would block them entirely.
    const rendering: any = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: {
            cssClass: 'dn-node',
            spatialProperties: { x: 0, y: 0, width, height },
            ...(renderingOptions as any).defaults
        },
        suffixId,
        root: {
            id: typeof options.plotContainer === 'string'
                ? options.plotContainer
                : (options.plotContainer as HTMLElement).id || 'dn-bokeh-root',
            description: 'Accessible data navigation',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: enter } },
        exitElement: { include: true }
    } as any);

    rendering.initialize();

    // Belt-and-suspenders: explicitly handle Enter/Space on the entry button.
    // The button is a native <button> so click fires on Enter, but some
    // browser/AT combinations intercept the event before it reaches the handler.
    if (rendering.entryButton) {
        rendering.entryButton.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!current) enter();
            }
        });
    }

    const input = dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules ?? {},
        entryPoint,
        exitPoint: rendering.exitElement?.id
    });

    function enter() {
        const node = input.enter();
        if (!node) return;
        navigate(node);
    }

    function navigate(node: import('data-navigator').NodeObject) {
        if (!node.renderId) node.renderId = node.id;
        if (!node.spatialProperties) {
            node.spatialProperties = { x: 0, y: 0, width, height };
        }

        if (previous) rendering.remove(previous);

        const el = rendering.render({ renderId: node.renderId, datum: node });
        if (!el) return;

        // The rendering module sets pixel-based inline styles from spatialProperties.
        // Override to 100% so the focus indicator always covers the full chart container.
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.top = '0';
        el.style.left = '0';

        el.addEventListener('keydown', (e: KeyboardEvent) => {
            const direction = input.keydownValidator(e);
            if (direction) {
                e.preventDefault();
                const next = input.move(current, direction);
                if (next) navigate(next);
            }
        });

        el.addEventListener('focus', () => {
            if (onNavigate) onNavigate(node);
        });

        input.focus(node.renderId);
        previous = current;
        current = node.id;
    }

    if (rendering.exitElement) {
        rendering.exitElement.addEventListener('focus', () => {
            if (current) rendering.remove(current);
            current = null;
            if (onExit) onExit();
        });
    }

    return {
        destroy() {
            // Remove elements the rendering module appended to plotEl
            try { rendering.wrapper?.remove?.(); } catch (_) {}
            try { rendering.exitElement?.remove?.(); } catch (_) {}
        },
        getCurrentNode() {
            return current ? (structure.nodes[current] ?? null) : null;
        }
    };
}

// ─── Main function ───────────────────────────────────────────────────────────

/**
 * Adds accessible data-navigator to a Bokeh chart.
 *
 * Text-chat mode (default) places the accessible UI adjacent to the plot
 * and marks the Bokeh canvas inert so assistive technologies skip it.
 * Keyboard mode places keyboard navigation elements *inside* the plot container
 * and must NOT mark the container inert.
 */
export function addDataNavigator(options: BokehWrapperOptions): BokehWrapperInstance {
    const { mode = 'text', onNavigate, onExit, onClick, onHover, llm } = options;

    const plotEl = resolveEl(options.plotContainer);
    if (!plotEl) {
        throw new Error(
            `@data-navigator/bokeh-wrapper: plotContainer "${options.plotContainer}" not found.`
        );
    }

    // Only mark inert in text mode — the accessible UI is outside the container.
    // In keyboard mode the navigation elements live INSIDE the container, so inert
    // would block them entirely.
    const didSetInert = mode === 'text';
    if (didSetInert) {
        plotEl.setAttribute('inert', 'true');
    }

    const structOpts = buildStructureOptions(options);

    // How many named dimensions does this structure declare?
    const dimCount: number = (structOpts as any).dimensions?.values?.length ?? 0;

    // Resolve the root description — user override wins, otherwise auto-build.
    const resolveDescription = () => {
        if (typeof options.describeRoot === 'function') return options.describeRoot(options);
        if (typeof options.describeRoot === 'string') return options.describeRoot;
        return buildChartDescription(options, dimCount);
    };

    if (dimCount > 1) {
        // Multi-dimension: inject a Level 0 root node via the dimensions API *before*
        // calling dataNavigator.structure(), so it becomes the natural entry point.
        // Respect any Level 0 node the caller may have already provided.
        const dims = (structOpts as any).dimensions;
        if (!dims.parentOptions) dims.parentOptions = {};
        if (!dims.parentOptions.addLevel0) {
            const plotId = typeof options.plotContainer === 'string'
                ? options.plotContainer.replace(/[^a-zA-Z0-9_-]/g, '')
                : 'dn';
            dims.parentOptions.addLevel0 = {
                id: `${plotId}-chart-root`,
                edges: [],
                semantics: { label: resolveDescription() }
            };
        }
    }

    const structure: Structure = dataNavigator.structure(structOpts as any);

    if (dimCount === 1 && structure.dimensions) {
        // Single dimension: set the description directly on the dimension root node.
        // data-navigator's defaultDescribeNode checks node.semantics?.label first,
        // so this replaces the terse auto-generated label with the full chart summary.
        const desc = resolveDescription();
        for (const dim of Object.values(structure.dimensions as Record<string, { nodeId: string }>)) {
            const node = structure.nodes[dim.nodeId];
            if (node) (node as any).semantics = { label: desc };
        }
    }

    // Ensure every node has semantics.label — required by the rendering module in
    // keyboard mode (aria-label on every rendered element), and used by textChat's
    // defaultDescribeNode as the primary description source when present.
    prepareNodeSemantics(structure);

    const cleanups: Array<() => void> = [];

    // Text-chat interface
    let textChatInstance: TextChatInstance | null = null;
    if (mode === 'text' || mode === 'both') {
        const { el: chatEl, owned } = resolveChatContainer(options, plotEl);

        textChatInstance = dataNavigator.textChat({
            structure,
            container: chatEl,
            data: options.data as Record<string, unknown>[],
            commandLabels: buildCommandLabels(options),
            onNavigate,
            onExit,
            onClick,
            onHover,
            llm
        } as any);

        if (owned) {
            cleanups.push(() => {
                try { chatEl.parentElement?.removeChild(chatEl); } catch (_) {}
            });
        }
    }

    // Keyboard interface
    let keyboardMode: ReturnType<typeof setupKeyboardMode> | null = null;
    if (mode === 'keyboard' || mode === 'both') {
        keyboardMode = setupKeyboardMode(structure, plotEl, options);
        cleanups.push(() => keyboardMode?.destroy());
    }

    return {
        destroy() {
            textChatInstance?.destroy();
            for (const cleanup of cleanups) cleanup();
            if (didSetInert) plotEl.removeAttribute('inert');
        },
        getCurrentNode() {
            return textChatInstance?.getCurrentNode() ?? keyboardMode?.getCurrentNode() ?? null;
        },
        structure
    };
}
