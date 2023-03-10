import { defaultKeyBindings, defaultDirections } from './keycodes';

export const dataNavigator = options => {
    // local variables
    let dn = {};
    let currentFocus = null;
    let previousFocus = null;
    let entryPoint = null;
    let exit = null;
    let keyBindings = defaultKeyBindings;
    let directions = defaultDirections;
    let root = null;

    // local methods
    const handleKeydownInteraction = e => {
        const direction = keyBindings[e.code];
        if (direction) {
            console.log('direction', direction);
            console.log('keycode', e.code);
            console.log('keyBindings', keyBindings);
            e.preventDefault();
            dn.move(direction);
        }
    };
    const handleFocusInteraction = e => {
        console.log('focus', e);
        /* On focus:
            remove events from previous location 
            calculate x/y/width/height on focus
            add events to focused element
        */
    };
    const handleBlurInteraction = e => {
        // clearStructure()
    }
    const buildNode = id => {
        // const options = dn.currentOptions
        const node = document.createElement('figure'); // subject to change based on new props
        node.setAttribute('role', 'figure');
        node.id = id;
        node.classList.add('dn-node');
        const d = options.data.nodes[id];
        if (d.cssClass) {
            node.classList.add(d.cssClass);
        }
        node.style.width = parseFloat(d.width || '0') + 'px';
        node.style.height = parseFloat(d.height || '0') + 'px';
        node.style.left = parseFloat(d.x || '0') + 'px';
        node.style.top = parseFloat(d.y || '0') + 'px';
        node.setAttribute('tabindex', '-1');
        node.addEventListener('keydown', handleKeydownInteraction);
        node.addEventListener('focus', handleFocusInteraction);
        node.addEventListener('blur', handleBlurInteraction)

        const nodeText = document.createElement('div');
        nodeText.setAttribute('role', 'img'); // subject to change based on new props
        nodeText.classList.add('dn-node-text');
        if (options.showText) {
            nodeText.innerText = d.description;
        }

        nodeText.setAttribute('aria-label', d.description);

        node.appendChild(nodeText);
        root.appendChild(node);
        return node;
    };

    const focusNode = id => {
        const node = document.getElementById(id);
        if (node) {
            previousFocus = currentFocus;
            currentFocus = id;
            console.log('focusing', id, node);
            node.focus();
        }
    };

    const deleteNode = id => {
        const node = document.getElementById(id);
        if (node) {
            node.removeEventListener('keydown', handleKeydownInteraction);
            node.removeEventListener('focus', handleFocusInteraction);
            node.removeEventListener('blur', handleBlurInteraction);
            node.remove();
        }
    };

    const initiateNodeLifeCycle = (newId, oldId) => {
        buildNode(newId);
        focusNode(newId);
        deleteNode(oldId);
    };

    const clearStructure = () => {
        deleteNode(currentFocus);
        previousFocus = currentFocus;
        currentFocus = null;
    }

    // exported methods with dn object
    // organized by: get[Current/Previous]Focus, setNavigationKeyBindings, build, move, and then events (hooks)
    dn.getCurrentFocus = () => {
        return currentFocus;
    };

    dn.getPreviousFocus = () => {
        return previousFocus;
    };

    dn.setNavigationKeyBindings = navKeyBindings => {
        console.log('setting key bindings', navKeyBindings);
        if (!navKeyBindings) {
            // Object.keys(keyBindings).forEach(key => {
            //     // directions = {
            //     //     down: "",
            //     //     left: "",
            //     //     right: "",
            //     //     up: "",
            //     //     backward: "",
            //     //     child: "",
            //     //     parent: "",
            //     //     forward: ""
            //     // }
            //     directions[keyBindings[key]].key = key;
            // });
            keyBindings = defaultKeyBindings;
            directions = defaultDirections;
        } else {
            keyBindings = {};
            directions = navKeyBindings;
            Object.keys(navKeyBindings).forEach(direction => {
                const navOption = navKeyBindings[direction];
                // if (navOption.rebindKeycodes) {
                //     Object.keys(navOption.rebindKeycodes).forEach(rebind => {
                //         directions[rebind].key = navOption.rebindKeycodes[rebind];
                //     });
                // }
                keyBindings[navOption.key] = direction;
            });
        }
        // keyBindings = {};
        // Object.keys(directions).forEach(key => {
        //     keyBindings[directions[key].key] = key;
        // });
    };

    dn.build = () => {
        // to-do: remove any elements from previous build? lifecycle stuff?
        console.log('building', options);
        // NOTE: the keys are based on insertion order EXCEPT when keys are number-like (or parse to ints)
        // so if someone passes ids in that are "1" or "2", then those go first in numerical order
        if (options.data) {
            // dn.currentOptions = options
            if (options.entryPoint) {
                entryPoint = options.entryPoint;
            } else {
                entryPoint = Object.keys(options.data.nodes)[0];
            }
        } else {
            console.error(
                'No data found, cannot enter: options.data must contain a valid hash object of data for dn.build'
            );
            return;
        }

        if (options.id) {
            console.log('building navigator!', options);

            // build root
            root = document.createElement('div');
            root.id = 'dn-root-' + options.id;
            root.classList.add('dn-root');
            root.style.width = options.width || '100%';
            root.style.height = options.height;

            // TO-DO: build interaction instructions/menu

            // build entry button
            const entry = document.createElement('button');
            entry.id = 'dn-entry-button-' + options.id;
            entry.classList.add('dn-entry-button');
            entry.innerText = `Enter navigation area`;
            entry.addEventListener('click', dn.enter);
            root.appendChild(entry);

            exit = document.createElement('div');

            exit.id = 'dn-exit-' + options.id;
            exit.classList.add('dn-exit-position');
            exit.innerText = `End of data structure.`;
            exit.setAttribute('aria-label',`End of data structure.`);
            exit.setAttribute('role','note');
            exit.setAttribute('tabindex','-1');
            exit.style.position = 'absolute';
            exit.style.bottom = '-20px';
            exit.style.display = 'none';
            exit.addEventListener('focus', () => {
                console.log('deleting all things!');
                exit.style.display = 'block';
                clearStructure()
            });
            exit.addEventListener('blur', () => {
                exit.style.display = 'none';
            });
            root.appendChild(exit);

            dn.setNavigationKeyBindings(options.navigation);

            // build the whole structure, if props sent
            // buildNode(entryPoint)

            return root;
        } else {
            console.error('No id found: options.id must be specified for dataNavigator.build');
            return;
        }
    };

    dn.move = direction => {
        if (currentFocus) {
            const d = options.data.nodes[currentFocus];
            if (d.edges) {
                let target = null;
                let i = 0;
                const x = directions[direction];

                const types = x.types || direction; // hasNavigationRules.key;
                const verifyEdge = (type, edge) => {
                    // below we could use "!(edge.target === currentFocus) ? 1 : !(edge.source === currentFocus) ? -1 : 0"
                    // because I would want it to explicitly encourage movement to a target
                    // as long as the current node is not the target
                    // on bob, we want to go to jill
                    // edge says any->jill
                    // so we get 1 and move to jill (this is the case I want to solve for)
                    // on jill, want to go to bob
                    // edge says bob->jill,
                    // so we get -1 and move to bob
                    // but what if I am on bob, and just move somewhere
                    // and the edge says zonk->zork
                    // we would get 1
                    // no error would throw! we'd move to zork
                    // so, is it possible to have an edge on a node where neither source or target are the node?
                    // we would need to make sure the node is at least valid in one direction?
                    // eg: const valid = currentFocus === t || currentFocus === s
                    if (!(type === edge.type)) {
                        return null
                    }
                    const t =
                        typeof edge.target === 'string' ? edge.target : edge.target(d, currentFocus, previousFocus);
                    const s =
                        typeof edge.source === 'string' ? edge.source : edge.source(d, currentFocus, previousFocus);
                    const vector = s === currentFocus ? 1 : t === currentFocus ? -1 : 0;
                    const otherID = vector === 1 ? t : vector === -1 ? s : null;
                    return otherID && vector === x.direction ? otherID : null;
                };
                for (i = 0; i < d.edges.length; i++) {
                    const edge = options.data.edges[d.edges[i]];
                    if (Array.isArray(types)) {
                        types.forEach(type => {
                            if (!target) {
                                target = verifyEdge(type, edge);
                                console.log(target)
                            }
                        });
                    } else {
                        target = verifyEdge(types, edge);
                    }
                    if (target) {
                        break;
                    }
                }
                if (target) {
                    console.log('we found a target?');
                    initiateNodeLifeCycle(target, currentFocus);
                }
            }
        }
    };
    dn.moveTo = id => {
        const target = document.getElementById(id);
        if (target) {
            previousFocus = currentFocus;
            currentFocus = id;
            target.focus();
        } else {
            initiateNodeLifeCycle(id, currentFocus);
        }
    };
    dn.enter = () => {
        dn.moveTo(entryPoint);
    };
    dn.exit = () => {
        console.log('exit has been called',exit);
        exit.style.display = 'block';
        exit.focus();
    };

    // dn.select = () => {}
    // dn.escape = () => {}
    // dn.undo = () => {}
    // dn.redo = () => {}
    dn.hooks = {};
    dn.hooks.navigation = () => {};
    dn.hooks.focus = () => {};
    dn.hooks.selection = () => {};
    dn.hooks.keydown = () => {};
    dn.hooks.pointerClick = () => {};
    return dn;
};

export const describeNode = (d, descriptionOptions) => {
    const keys = Object.keys(d);
    let description = '';
    keys.forEach(key => {
        description += `${descriptionOptions.omitKeyNames ? '' : key + ': '}${d[key]}. `;
    });
    description += descriptionOptions.semanticLabel || 'Data point.';
    return description;
};

export const transformData = options => {
    // need to convert to a graph structure!
    // https://adrianmejia.com/data-structures-for-beginners-graphs-time-complexity-tutorial/
    // should probably save each item as a hash? array? hmmm....

    // options:
    // {
    //     data: dataUsedInChart,
    //     lrVariable: "series", // left/right
    //     udVariable: "category", // up/down
    //     fbVariable: "group", // back/forward
    //     pcVariable: "level", // parent/child
    //     refVariable: "id", // if an element exists
    //     flow: "sequential", // "circular"
    //     cssClass: "dn-node",
    //     // htmlAddition: "<div class=''></div>",
    //     description: d => { return dn.describe(d, descriptionOptions) }, // by default will throw an error if unspecified
    //     x: "", // if no refVariable, then x can be specified
    //     y: "", // if no refVariable, then y can be specified
    //     width: "", // if no refVariable, then width can be specified
    //     height: "", // if no refVariable, then height can be specified
    //     idPrefix: ""
    // }
    return {};
};
