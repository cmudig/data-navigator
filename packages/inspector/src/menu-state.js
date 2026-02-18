/**
 * Creates a shared observable state manager for the console menu.
 * Single source of truth for checked items, hover state, and console log entries.
 * Both menu sections and console items read/write through this.
 */
export function createMenuState() {
    const checked = new Map(); // Map<"type:id", {type, id}>
    const logEntries = [];     // Array<{type, id, data, relatedItems, timestamp}>
    const listeners = new Set();

    function notify(changeType, payload) {
        listeners.forEach(fn => fn(changeType, payload));
    }

    return {
        /** Subscribe to state changes. Returns an unsubscribe function. */
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },

        // --- Checkbox management ---

        check(type, id) {
            const key = type + ':' + id;
            if (checked.has(key)) return;
            checked.set(key, { type, id });
            notify('check', { type, id });
        },

        uncheck(type, id) {
            const key = type + ':' + id;
            if (!checked.has(key)) return;
            checked.delete(key);
            notify('uncheck', { type, id });
        },

        toggle(type, id) {
            const key = type + ':' + id;
            if (checked.has(key)) {
                checked.delete(key);
                notify('uncheck', { type, id });
            } else {
                checked.set(key, { type, id });
                notify('check', { type, id });
            }
        },

        isChecked(type, id) {
            return checked.has(type + ':' + id);
        },

        getChecked() {
            return Array.from(checked.values());
        },

        hasAnyChecked() {
            return checked.size > 0;
        },

        // --- Hover state (one item at a time) ---

        hoveredItem: null, // {type, id} or null

        setHover(type, id) {
            this.hoveredItem = { type, id };
            notify('hover', { type, id });
        },

        clearHover() {
            const prev = this.hoveredItem;
            this.hoveredItem = null;
            if (prev) {
                notify('unhover', prev);
            }
        },

        // --- Console log entries ---

        addLogEntry(entry) {
            logEntries.push(entry);
            notify('log-added', entry);
        },

        getLogEntries() {
            return logEntries;
        }
    };
}
