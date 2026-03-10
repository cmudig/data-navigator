/// <reference types="vite/client" />

declare module '@data-navigator/inspector' {
    export function ForceGraph(
        data: { nodes: unknown[]; links: unknown[] },
        options?: Record<string, unknown>
    ): SVGSVGElement;

    export function TreeGraph(
        data: { nodes: unknown[]; links: unknown[] },
        options?: Record<string, unknown>
    ): SVGSVGElement;

    export function Inspector(options: {
        structure: unknown;
        container: HTMLElement | string;
        size?: number;
        colorBy?: string;
        nodeRadius?: number;
        edgeExclusions?: string[];
        nodeInclusions?: string[];
        mode?: 'force' | 'tree';
        showConsoleMenu?: { data: unknown[]; structure?: unknown; input?: unknown; rendering?: unknown };
    }): {
        svg: SVGElement;
        highlight: (nodeId: string) => void;
        clear: () => void;
        destroy: () => void;
        menuState?: unknown;
    };

    export function buildLabel(node: unknown, colorBy?: string): string;
}
