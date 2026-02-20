/**
 * @data-navigator/bokeh-wrapper
 *
 * Adds accessible data navigation to Bokeh charts with minimal setup.
 * Uses the data-navigator text-chat interface by default so that the
 * broadest range of users — including screen reader users, keyboard-only
 * users, and mobile users — can explore your chart.
 *
 * @example
 * ```js
 * import { addDataNavigator } from '@data-navigator/bokeh-wrapper';
 *
 * // After rendering your Bokeh chart:
 * const wrapper = addDataNavigator({
 *   plotContainer: '#my-plot',
 *   data: myData,
 * });
 * ```
 */

import dataNavigator from 'data-navigator';
import type { Structure, TextChatInstance } from 'data-navigator';
import { buildStructureOptions, buildCommandLabels, resolveEl } from './structure-builder';
import type { BokehWrapperOptions, BokehWrapperInstance } from './types';

export type { BokehWrapperOptions, BokehWrapperInstance, BokehChartType, BokehWrapperMode } from './types';

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

    const rendering = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: {
            cssClass: 'dn-node',
            spatialProperties: { x: 0, y: 0, width, height },
            ...renderingOptions.defaults
        },
        suffixId: `dn-bokeh-${Math.random().toString(36).slice(2, 6)}`,
        root: {
            id: typeof options.plotContainer === 'string'
                ? options.plotContainer
                : (options.plotContainer as HTMLElement).id || 'dn-bokeh-root',
            description: 'Accessible data navigation',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: enter } },
        exitElement: { include: true },
        ...renderingOptions
    } as any);

    rendering.initialize();

    const input = dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules ?? {},
        entryPoint,
        exitPoint: rendering.exitElement?.id
    });

    function enter() {
        const node = input.enter();
        if (node) navigate(node);
    }

    function navigate(node: import('data-navigator').NodeObject) {
        if (!node.renderId) node.renderId = node.id;
        if (!node.spatialProperties) {
            node.spatialProperties = { x: 0, y: 0, width, height };
        }

        if (previous) rendering.remove(previous);

        const el = rendering.render({ renderId: node.renderId, datum: node });

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

    rendering.exitElement?.addEventListener('focus', () => {
        if (current) rendering.remove(current);
        current = null;
        if (onExit) onExit();
    });

    return {
        destroy() {
            rendering.destroy?.();
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
 * The default interface is a text-chat menu, which works for the broadest
 * range of assistive technologies and input modalities. Enable keyboard-first
 * navigation with `mode: 'keyboard'` or show both with `mode: 'both'`.
 *
 * @param options - Configuration options
 * @returns A `BokehWrapperInstance` with `destroy()`, `getCurrentNode()`, and `structure`.
 *
 * @example
 * ```js
 * // Minimal — smart defaults infer chart type and build navigation
 * const wrapper = addDataNavigator({ plotContainer: '#plot', data });
 *
 * // With explicit type and fields
 * const wrapper = addDataNavigator({
 *   plotContainer: '#plot',
 *   data,
 *   type: 'stacked_bar',
 *   xField: 'store',
 *   yField: 'cost',
 *   groupField: 'fruit',
 *   onNavigate: (node) => highlightBokehBar(node.data),
 *   onClick: (node) => selectBokehBar(node.data),
 * });
 *
 * // Clean up when done
 * wrapper.destroy();
 * ```
 */
export function addDataNavigator(options: BokehWrapperOptions): BokehWrapperInstance {
    const { mode = 'text', onNavigate, onExit, onClick, onHover, llm } = options;

    // 1. Resolve plot container
    const plotEl = resolveEl(options.plotContainer);
    if (!plotEl) {
        throw new Error(
            `@data-navigator/bokeh-wrapper: plotContainer "${options.plotContainer}" not found.`
        );
    }

    // 2. Mark Bokeh output as inert so AT skips the inaccessible canvas/SVG
    plotEl.setAttribute('inert', 'true');

    // 3. Build data-navigator structure
    const structOpts = buildStructureOptions(options);
    const structure: Structure = dataNavigator.structure(structOpts as any);

    const cleanups: Array<() => void> = [];

    // 4. Text-chat interface
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
            cleanups.push(() => chatEl.parentElement?.removeChild(chatEl));
        }
    }

    // 5. Keyboard interface
    let keyboardMode: ReturnType<typeof setupKeyboardMode> | null = null;
    if (mode === 'keyboard' || mode === 'both') {
        keyboardMode = setupKeyboardMode(structure, plotEl, options);
        cleanups.push(() => keyboardMode?.destroy());
    }

    // 6. Return public instance
    return {
        destroy() {
            textChatInstance?.destroy();
            for (const cleanup of cleanups) cleanup();
            plotEl.removeAttribute('inert');
        },
        getCurrentNode() {
            return textChatInstance?.getCurrentNode() ?? keyboardMode?.getCurrentNode() ?? null;
        },
        structure
    };
}
