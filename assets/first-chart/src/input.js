import dataNavigator from '../node_modules/data-navigator/dist/index.mjs';

// Creates the input handler, which maps keyboard events to
// graph traversal. Returns methods for entering, exiting,
// moving, and focusing nodes.
export function createInput(structure, exitPointId) {
    return dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint: '_0',
        exitPoint: exitPointId
    });
}
