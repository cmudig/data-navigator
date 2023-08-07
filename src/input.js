import { defaultKeyBindings, GenericFullNavigationRules } from './consts';

export const input = InputOptions => {
    let options = { ...InputOptions };
    let inputHandler = {};
    let keyBindings = defaultKeyBindings;
    let directions = GenericFullNavigationRules;

    inputHandler.moveTo = id => {
        // console.log('moveTo', id);
        const target = options.structure.nodes[id];
        // console.log('target', target);
        if (target) {
            return target;
        }
        return;
    };
    inputHandler.move = (currentFocus, direction) => {
        if (currentFocus) {
            const d = options.structure.nodes[currentFocus];
            if (d.edges) {
                let target = null;
                let i = 0;
                const navRule = directions[direction];
                if (!navRule) {
                    return;
                }
                const findTarget = (rule, edge) => {
                    if (!(rule === direction)) {
                        return null;
                    }
                    let resolvedNodes = {};
                    resolvedNodes.target =
                        typeof edge.target === 'string' ? edge.target : edge.target(d, currentFocus);
                    resolvedNodes.source =
                        typeof edge.source === 'string' ? edge.source : edge.source(d, currentFocus);
                    return !(resolvedNodes[navRule.direction] === currentFocus) ? resolvedNodes[navRule.direction] : null;
                };
                for (i = 0; i < d.edges.length; i++) {
                    const edge = options.structure.edges[d.edges[i]];
                    // if (Array.isArray(types)) {
                    edge.navigationRules.forEach(rule => {
                        if (!target) {
                            target = findTarget(rule, edge);
                        }
                    });
                    // } else {
                    //     target = verifyEdge(types, edge);
                    // }
                    if (target) {
                        break;
                    }
                }
                if (target) {
                    return inputHandler.moveTo(target);
                }
                return undefined;
            }
        }
    };
    inputHandler.enter = () => {
        if (options.entryPoint) {
            return inputHandler.moveTo(options.entryPoint);
        } else {
            console.error('No entry point was specified in InputOptions, returning undefined');
            return;
        }
    };
    inputHandler.exit = () => {
        if (options.exitPoint) {
            return options.exitPoint;
        } else {
            console.error('No exit point was specified in InputOptions, returning undefined');
            return;
        }
    };
    inputHandler.keydownValidator = e => {
        const direction = keyBindings[e.code];
        if (direction) {
            return direction;
        }
    };
    inputHandler.focus = renderId => {
        const node = document.getElementById(renderId);
        if (node) {
            node.focus();
        }
    };
    inputHandler.setNavigationKeyBindings = navKeyBindings => {
        if (!navKeyBindings) {
            keyBindings = defaultKeyBindings;
            directions = GenericFullNavigationRules;
        } else {
            keyBindings = {};
            directions = navKeyBindings;
            Object.keys(navKeyBindings).forEach(direction => {
                const navOption = navKeyBindings[direction];
                keyBindings[navOption.key] = direction;
            });
        }
    };

    inputHandler.setNavigationKeyBindings(options.navigationRules);
    return inputHandler;
};
