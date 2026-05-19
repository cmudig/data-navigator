import dataNavigator from 'data-navigator';

export function createInput(structure, exitPointId) {
    return dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint: 'glacial-sediment-w-nw',
        exitPoint: exitPointId
    });
}
