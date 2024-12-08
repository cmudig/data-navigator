import { default as dataNavigator } from '../src/index.ts';
import { ForceGraph } from './force-graph.js';
// import { describeNode } from '../src/utilities.ts';

const convertToArray = o => {
    let x = [];
    Object.keys(o).forEach(k => {
        x.push(o[k]);
    });
    return x;
};

const hideTooltip = id => {
    document.getElementById(id).classList.add('hidden');
};

const showTooltip = (d, id, size, coloredBy) => {
    const tooltip = document.getElementById(id);
    tooltip.classList.remove('hidden');
    tooltip.innerText = d.semantics?.label || `${d.id}${d.data?.[coloredBy] ? ', ' + d.data[coloredBy] : ''}`;
    const bbox = tooltip.getBoundingClientRect();
    const offset = bbox.width / 2;
    const yOffset = bbox.height;
    tooltip.style.textAlign = 'left';
    tooltip.style.transform = `translate(${size / 2 - offset}px,${size - yOffset}px)`;
};

const buildGraph = (structure, rootId, size, colorBy) => {
    let graph = ForceGraph(
        {
            nodes: convertToArray(structure.nodes),
            links: convertToArray(structure.edges)
        },
        {
            nodeId: d => d.id,
            nodeGroup: d => d.data?.[colorBy],
            width: size,
            height: size
        }
    );
    document.getElementById(rootId).appendChild(graph);
    document
        .getElementById(rootId)
        .querySelectorAll('circle')
        .forEach(c => {
            c.id = c.__data__?.id;
            c.addEventListener('mousemove', e => {
                if (e.target?.__data__?.id) {
                    let d = e.target.__data__;
                    console.log(d.id, d, structure.nodes[d.id]);
                    showTooltip(structure.nodes[d.id], `${rootId}-tooltip`, size, colorBy);
                }
            });
            c.addEventListener('mouseleave', () => {
                hideTooltip(`${rootId}-tooltip`);
            });
        });
};

const simpleDataTest = [
    {
        id: 'a',
        cat: 'meow',
        num: 3
    },
    {
        id: 'b',
        cat: 'meow',
        num: 1
    },
    {
        id: 'c',
        cat: 'meow',
        num: 2
    },
    {
        id: 'd',
        cat: 'bork',
        num: 4
    }
];
console.log('simpleDataTest', simpleDataTest);
let simpleStructure = dataNavigator.structure({
    data: simpleDataTest,
    idKey: 'id',
    dimensions: {
        values: [
            {
                dimensionKey: 'cat',
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                }
            },
            {
                dimensionKey: 'num',
                type: 'numerical',
                behavior: {
                    extents: 'terminal'
                }
            }
        ]
    }
});
console.log('simpleStructure', simpleStructure);
buildGraph(simpleStructure, 'simple', 300, 'cat');

let addDataTest = [...simpleDataTest];
addDataTest.push({
    id: 'e',
    cat: 'bork',
    num: 12
});
console.log('addDataTest', addDataTest);
let addedDataStructure = dataNavigator.structure({
    data: addDataTest,
    addIds: true,
    idKey: 'addedId',
    dimensions: {
        values: [
            {
                dimensionKey: 'cat',
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                }
            },
            {
                dimensionKey: 'num',
                type: 'numerical',
                behavior: {
                    extents: 'terminal'
                }
            }
        ]
    }
});
console.log('addedDataStructure', addedDataStructure);
buildGraph(addedDataStructure, 'added', 300, 'cat');

/*
        checklist for edge creation: (we start low and work up)
        within divisions:
            self-siblingForward (each)
            self-parentDivision (each)
            parentDivision-firstChild (1x)
        across divisions:
            divisionSelf-divisionForward (each)
            divisionSelf-dimension (each)
            parentDimension-firstDivision (1x)
        across dimensions (check if level1Order):
            dimensionSelf-forward (each)
            dimensionSelf-level0Node (each, if level0 set)
            level0Node-firstDimension (1x, if level0 set)
        final stage (if generic edges):
            item-genericEdge

        DimensionOptions = {
            values: DimensionList;
            parentOptions: {
                level1Options?: {
                    order: AddOrReferenceNodeList;
                    behavior?: DimensionBehavior;
                    navigationRules?: DimensionNavigationRules;
                };
                addLevel0?: NodeObject;
            };
            adjustDimensions?: AdjustingFunction;
        }
            ["previous_" + dim.dimensionKey, "next_" + dim.dimensionKey],
            ["parent_" + dim.dimensionKey, "child"]
    */

// const dataTest = [
//     {
//         state: "California",
//         region: "West",
//         leaning: "Liberal",
//         rank: 1,
//         quality: 10,
//         resilience: 5,
//         pop: 39
//     },
//     {
//         state: "Washington",
//         region: "West",
//         leaning: "Liberal",
//         rank: 2,
//         quality: 10,
//         resilience: 9,
//         pop: 8
//     },
//     {
//         state: "Oregon",
//         region: "West",
//         leaning: "Liberal",
//         rank: 15,
//         quality: 7,
//         resilience: 9,
//         pop: 4
//     },
//     {
//         state: "Illinois",
//         region: "Central",
//         leaning: "Liberal",
//         rank: 10,
//         quality: 7,
//         resilience: 5,
//         pop: 13
//     },
//     {
//         state: "Michigan",
//         region: "Central",
//         leaning: "Conservative",
//         rank: 21,
//         quality: 5,
//         resilience: 5,
//         pop: 10
//     },
//     {
//         state: "Massachusetts",
//         region: "East",
//         leaning: "Liberal",
//         rank: 3,
//         quality: 10,
//         resilience: 7,
//         pop: 7
//     },
//     {
//         state: "New York",
//         region: "East",
//         leaning: "Liberal",
//         rank: 9,
//         quality: 8,
//         resilience: 6,
//         pop: 20
//     },
//     {
//         state: "Pennsylvania",
//         region: "East",
//         leaning: "Conservative",
//         rank: 13,
//         quality: 7,
//         resilience: 5,
//         pop: 13
//     },
//     {
//         state: "Georgia",
//         region: "East",
//         leaning: "Conservative",
//         rank: 20,
//         quality: 4,
//         resilience: 4,
//         pop: 11
//     },
//     {
//         state: "Colorado",
//         region: "Mountain",
//         leaning: "Liberal",
//         rank: 4,
//         quality: 8,
//         resilience: 10,
//         pop: 6
//     },
//     {
//         state: "Wyoming",
//         region: "Mountain",
//         leaning: "Conservative",
//         rank: 50,
//         quality: 1,
//         resilience: 5,
//         pop: 1
//     },
//     {
//         state: "Idaho",
//         region: "Mountain",
//         leaning: "Conservative",
//         rank: 40,
//         quality: 1,
//         resilience: 6,
//         pop: 2
//     },
// ]

// data: GenericDataset;
// idKey: DynamicNodeIdKey;
// keys: KeyList;
// renderIdKey?: DynamicRenderIdKey;
// dimensions?: DimensionOptions;
// genericEdges?: EdgeOptions;
// dataType?: DataType;
// addIds?: boolean;
// navigationRules?: NavigationRules;

// dimensionKey: DimensionKey;
// nestedSettings?: NestedSettings;
// type?: DimensionType;
// behavior?: DimensionBehavior;
// navigationRules?: NavigationList;
// sortingFunction?: SortingFunction;

let parentIdGenerator = (d, s) => {
    return d[s.dimensionKey];
};
let ascendingSort = (a, b, c) => a[c.dimensionKey] - b[c.dimensionKey];
let descendingSort = (a, b, c) => b[c.dimensionKey] - a[c.dimensionKey];

/*
let structureTestWithStateIds = buildStructure({
    data: dataTest,
    idKey: "state",
    dimensions:{ 
        values: [
            {
                dimensionKey: "region",
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "leaning",
                // type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "rank",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: ascendingSort
            },
            {
                dimensionKey: "quality",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "resilience",
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "pop",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            }
    ]}
})
console.log(structureTestWithStateIds)

let structureTestWithShortIds = buildStructure({
    data: dataTest,
    idKey: "id",
    dimensions: { 
        values: [
            {
                dimensionKey: "region",
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "leaning",
                // type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "rank",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: ascendingSort
            },
            {
                dimensionKey: "quality",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "resilience",
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "pop",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            }
        ]
    },
    addIds: true
})
console.log(structureTestWithLongIds)

let structureTestWithLongIds = buildStructure({
    data: dataTest,
    idKey: "id",
    dimensions: {
        values: [
            {
                dimensionKey: "region",
                type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "leaning",
                // type: 'categorical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            },
            {
                dimensionKey: "rank",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: ascendingSort
            },
            {
                dimensionKey: "quality",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "resilience",
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                },
                sortingFunction: descendingSort
            },
            {
                dimensionKey: "pop",
                type: 'numerical',
                behavior: {
                    extents: 'circular'
                },
                nestedSettings: {
                    nested: true,
                    derivedParent: true,
                    parentNode: {
                        id: parentIdGenerator
                    }
                }
            }
        ],
    },
    addIds: true,
    keysForIdGeneration: [
        "state", // unique! but we don't do anything with this
        "region", // categorical
        "leaning", // categorical but no type sent
        "rank", // low to high, numerical
        "quality", // high to low, numerical
        "resilience", // high to low, numerical but no type sent
        "pop" // low to high, numerical, no sortingFunc sent
    ],
})
console.log(structureTestWithLongIds)
*/
