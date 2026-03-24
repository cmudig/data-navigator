import type { SkeletonNode } from './types';

/** Shared default renderProperties for all new nodes (manual and schema). */
export function defaultRenderProperties(): SkeletonNode['renderProperties'] {
    return {
        shape: 'rect',
        fillEnabled: false,
        fill: '#f6f6f7',
        opacity: 1,
        strokeWidth: 2,
        strokeColor: '#000000',
        strokeDash: 'solid',
        ariaRole: 'button',
        customClass: ''
    };
}

/** Shared default semantics for all new nodes. */
export function defaultSemantics(): SkeletonNode['semantics'] {
    return {
        label: '',
        name: 'data point',
        includeParentName: false,
        includeIndex: false,
        omitKeyNames: false
    };
}
