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

    export function Inspector(
        container: HTMLElement,
        structure: unknown,
        options?: Record<string, unknown>
    ): { destroy: () => void };

    export function buildLabel(node: unknown, colorBy?: string): string;
}
