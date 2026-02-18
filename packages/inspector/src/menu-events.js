/**
 * CustomEvent name constants and dispatch helper for the inspector console menu.
 * All events are dispatched on the container element with `bubbles: true`.
 */

export const EVENTS = {
    ITEM_HOVER: 'dn-inspector:item-hover',
    ITEM_UNHOVER: 'dn-inspector:item-unhover',
    ITEM_CHECK: 'dn-inspector:item-check',
    ITEM_UNCHECK: 'dn-inspector:item-uncheck',
    ITEM_LOG: 'dn-inspector:item-log',
    SELECTION_CHANGE: 'dn-inspector:selection-change'
};

/**
 * Dispatch a CustomEvent on the given container element.
 * @param {HTMLElement} container
 * @param {string} eventName - One of the EVENTS constants
 * @param {Object} detail - Event detail payload
 */
export function dispatch(container, eventName, detail) {
    container.dispatchEvent(new CustomEvent(eventName, {
        bubbles: true,
        detail
    }));
}
