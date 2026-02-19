import dataNavigator from 'data-navigator';

export function createInput(structure, entryPoint, exitPointId) {
    return dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint,
        exitPoint: exitPointId
    });
}
