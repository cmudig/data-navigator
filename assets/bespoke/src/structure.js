// All spatial coordinates use scale 1/8 of the original 4096×2821 SVG space.
// Displayed image is 512×353 px, so original coords ÷ 8 = CSS pixel position.

export const callbacks = { onSourceExit: null, onTimeExit: null };

export const structure = {
    nodes: {
        'glacial-sediment-w-nw': {
            id: 'glacial-sediment-w-nw',
            renderId: 'glacial-sediment-w-nw',
            edges: ['gswnw-gsnne', 'gsnee-gswnw', 'gswnw-trade-river', 'any-exit'],
            data: {},
            semantics: {
                label: 'Glacial sediment from the W and NW. Region. Contains Trade River, Pierce, and Marathon.'
            },
            spatialProperties: { x: 1, y: 1, width: 142, height: 351 }
        },
        'glacial-sediment-n-ne': {
            id: 'glacial-sediment-n-ne',
            renderId: 'glacial-sediment-n-ne',
            edges: ['gswnw-gsnne', 'gsnne-gsnee', 'gsnne-miller-creek', 'any-exit'],
            data: {},
            semantics: {
                label: 'Glacial sediment from the N and NE. Region. Contains Miller Creek, Copper Falls, and River Falls.'
            },
            spatialProperties: { x: 144, y: 1, width: 146, height: 351 }
        },
        'glacial-sediment-ne-e': {
            id: 'glacial-sediment-ne-e',
            renderId: 'glacial-sediment-ne-e',
            edges: ['gsnne-gsnee', 'gsnee-gswnw', 'gsnee-kewaunee', 'any-exit'],
            data: {},
            semantics: {
                label: 'Glacial sediment from the NE and E. Region. Contains Kewaunee, Oak Creek, Holy Hill, Zenda, and Walworth.'
            },
            spatialProperties: { x: 291, y: 1, width: 177, height: 351 }
        },
        'trade-river': {
            id: 'trade-river',
            renderId: 'trade-river',
            edges: ['gswnw-trade-river', 'trade-river-pierce', 'trade-river-miller-creek', 'any-exit'],
            data: {},
            semantics: {
                label: 'Trade River. Sediment from W/NW, deposited towards the end of the Wisconsin glaciation during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 42, y: 89, width: 53, height: 32 }
        },
        pierce: {
            id: 'pierce',
            renderId: 'pierce',
            edges: [
                'gswnw-pierce-out',
                'trade-river-pierce',
                'pierce-marathon',
                'pierce-marathon-lr',
                'walworth-pierce-lr',
                'any-exit'
            ],
            data: {},
            semantics: {
                label: 'Pierce. Sediment from W/NW, deposited by the Pre-Illinoian glaciation during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 13, y: 291, width: 53, height: 32 }
        },
        marathon: {
            id: 'marathon',
            renderId: 'marathon',
            edges: [
                'gswnw-marathon-out',
                'pierce-marathon',
                'pierce-marathon-lr',
                'marathon-river-falls-lr',
                'any-exit'
            ],
            data: {},
            semantics: {
                label: 'Marathon. Sediment from W/NW, deposited by the Pre-Illinoian glaciation during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 70, y: 291, width: 53, height: 32 }
        },
        'miller-creek': {
            id: 'miller-creek',
            renderId: 'miller-creek',
            edges: [
                'gsnne-miller-creek',
                'miller-creek-copper-falls',
                'trade-river-miller-creek',
                'miller-creek-copper-falls-r',
                'any-exit'
            ],
            data: {},
            semantics: {
                label: 'Miller Creek. Top-most sediment from N/NE, deposited at the end of the Wisconsin glaciation during the Pleistocene Epoch and also deposited during the early Holocene Epoch.'
            },
            spatialProperties: { x: 165, y: 52, width: 53, height: 32 }
        },
        'copper-falls': {
            id: 'copper-falls',
            renderId: 'copper-falls',
            edges: [
                'gsnne-copper-falls-out',
                'miller-creek-copper-falls',
                'copper-falls-river-falls',
                'river-falls-copper-falls-lr',
                'copper-falls-kewaunee-lr',
                'any-exit'
            ],
            data: {},
            semantics: {
                label: 'Copper Falls. Sediment from N/NE, deposited from the middle of the Illinoian glaciation until the end of the Wisconsin glaciation during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 222, y: 76, width: 53, height: 176 }
        },
        'river-falls': {
            id: 'river-falls',
            renderId: 'river-falls',
            edges: [
                'gsnne-river-falls-out',
                'copper-falls-river-falls',
                'marathon-river-falls-lr',
                'river-falls-copper-falls-lr',
                'any-exit'
            ],
            data: {},
            semantics: {
                label: 'River Falls. Sediment from N/NE, deposited later by the Illinoian glaciation during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 166, y: 220, width: 53, height: 32 }
        },
        kewaunee: {
            id: 'kewaunee',
            renderId: 'kewaunee',
            edges: ['gsnee-kewaunee', 'kewaunee-oak-creek', 'copper-falls-kewaunee-lr', 'kewaunee-zenda-r', 'any-exit'],
            data: {},
            semantics: {
                label: 'Kewaunee. Sediment from NE/E, deposited at the end of the Wisconsin glaciation during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 306, y: 76, width: 94, height: 32 }
        },
        'oak-creek': {
            id: 'oak-creek',
            renderId: 'oak-creek',
            edges: [
                'gsnee-oak-creek-out',
                'kewaunee-oak-creek',
                'oak-creek-holy-hill',
                'holy-hill-oak-creek-lr',
                'oak-creek-zenda-r',
                'any-exit'
            ],
            data: {},
            semantics: {
                label: 'Oak Creek. Sediment from NE/E, deposited in the middle of the Wisconsin glaciation during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 347, y: 113, width: 53, height: 32 }
        },
        'holy-hill': {
            id: 'holy-hill',
            renderId: 'holy-hill',
            edges: [
                'gsnee-holy-hill-out',
                'oak-creek-holy-hill',
                'holy-hill-zenda',
                'copper-falls-holy-hill-l',
                'holy-hill-oak-creek-lr',
                'any-exit'
            ],
            data: {},
            semantics: {
                label: 'Holy Hill. Sediment from NE/E, deposited from early until after the middle of the Wisconsin glaciation, during the Pleistocene Epoch. Oak Creek was deposited alongside during the later half.'
            },
            spatialProperties: {
                x: 305,
                y: 113,
                width: 95,
                height: 85,
                path: 'M347.75,109.5V144.5H403.125V200.5H301.875V109.5H347.75Z'
            }
        },
        zenda: {
            id: 'zenda',
            renderId: 'zenda',
            edges: [
                'gsnee-zenda-out',
                'holy-hill-zenda',
                'zenda-walworth',
                'holy-hill-zenda-l',
                'zenda-pierce-r',
                'any-exit'
            ],
            data: {},
            semantics: {
                label: 'Zenda. Sediment from NE/E, deposited in during late Illinoian and early Wisconsin glaciations during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 404, y: 189, width: 53, height: 50 }
        },
        walworth: {
            id: 'walworth',
            renderId: 'walworth',
            edges: ['gsnee-walworth-out', 'zenda-walworth', 'holy-hill-walworth-l', 'walworth-pierce-lr', 'any-exit'],
            data: {},
            semantics: {
                label: 'Walworth. Sediment from NE/E, deposited in the middle of the Illinoian glaciation during the Pleistocene Epoch.'
            },
            spatialProperties: { x: 404, y: 242, width: 53, height: 32 }
        }
    },
    edges: {
        'gswnw-gsnne': {
            source: 'glacial-sediment-w-nw',
            target: 'glacial-sediment-n-ne',
            navigationRules: ['left', 'right']
        },
        'gsnne-gsnee': {
            source: 'glacial-sediment-n-ne',
            target: 'glacial-sediment-ne-e',
            navigationRules: ['left', 'right']
        },
        'gsnee-gswnw': {
            source: 'glacial-sediment-ne-e',
            target: 'glacial-sediment-w-nw',
            navigationRules: ['left', 'right']
        },
        'gswnw-trade-river': {
            source: 'glacial-sediment-w-nw',
            target: 'trade-river',
            navigationRules: ['drill-in', 'drill-out']
        },
        'gsnne-miller-creek': {
            source: 'glacial-sediment-n-ne',
            target: 'miller-creek',
            navigationRules: ['drill-in', 'drill-out']
        },
        'gsnee-kewaunee': {
            source: 'glacial-sediment-ne-e',
            target: 'kewaunee',
            navigationRules: ['drill-in', 'drill-out']
        },
        'gswnw-pierce-out': { source: 'glacial-sediment-w-nw', target: 'pierce', navigationRules: ['drill-out'] },
        'gswnw-marathon-out': { source: 'glacial-sediment-w-nw', target: 'marathon', navigationRules: ['drill-out'] },
        'gsnne-copper-falls-out': {
            source: 'glacial-sediment-n-ne',
            target: 'copper-falls',
            navigationRules: ['drill-out']
        },
        'gsnne-river-falls-out': {
            source: 'glacial-sediment-n-ne',
            target: 'river-falls',
            navigationRules: ['drill-out']
        },
        'gsnee-oak-creek-out': { source: 'glacial-sediment-ne-e', target: 'oak-creek', navigationRules: ['drill-out'] },
        'gsnee-holy-hill-out': { source: 'glacial-sediment-ne-e', target: 'holy-hill', navigationRules: ['drill-out'] },
        'gsnee-zenda-out': { source: 'glacial-sediment-ne-e', target: 'zenda', navigationRules: ['drill-out'] },
        'gsnee-walworth-out': { source: 'glacial-sediment-ne-e', target: 'walworth', navigationRules: ['drill-out'] },
        'trade-river-pierce': { source: 'trade-river', target: 'pierce', navigationRules: ['up', 'down'] },
        'pierce-marathon': { source: 'pierce', target: 'marathon', navigationRules: ['up', 'down'] },
        'miller-creek-copper-falls': {
            source: 'miller-creek',
            target: 'copper-falls',
            navigationRules: ['up', 'down']
        },
        'copper-falls-river-falls': { source: 'copper-falls', target: 'river-falls', navigationRules: ['up', 'down'] },
        'kewaunee-oak-creek': { source: 'kewaunee', target: 'oak-creek', navigationRules: ['up', 'down'] },
        'oak-creek-holy-hill': { source: 'oak-creek', target: 'holy-hill', navigationRules: ['up', 'down'] },
        'holy-hill-zenda': { source: 'holy-hill', target: 'zenda', navigationRules: ['up', 'down'] },
        'zenda-walworth': { source: 'zenda', target: 'walworth', navigationRules: ['up', 'down'] },
        'trade-river-miller-creek': {
            source: 'trade-river',
            target: 'miller-creek',
            navigationRules: ['left', 'right']
        },
        'pierce-marathon-lr': { source: 'pierce', target: 'marathon', navigationRules: ['left', 'right'] },
        'marathon-river-falls-lr': { source: 'marathon', target: 'river-falls', navigationRules: ['left', 'right'] },
        'miller-creek-copper-falls-r': { source: 'miller-creek', target: 'copper-falls', navigationRules: ['right'] },
        'river-falls-copper-falls-lr': {
            source: 'river-falls',
            target: 'copper-falls',
            navigationRules: ['left', 'right']
        },
        'copper-falls-kewaunee-lr': { source: 'copper-falls', target: 'kewaunee', navigationRules: ['left', 'right'] },
        'copper-falls-holy-hill-l': { source: 'copper-falls', target: 'holy-hill', navigationRules: ['left'] },
        'kewaunee-zenda-r': { source: 'kewaunee', target: 'zenda', navigationRules: ['right'] },
        'holy-hill-oak-creek-lr': { source: 'holy-hill', target: 'oak-creek', navigationRules: ['left', 'right'] },
        'oak-creek-zenda-r': { source: 'oak-creek', target: 'zenda', navigationRules: ['right'] },
        'holy-hill-zenda-l': { source: 'holy-hill', target: 'zenda', navigationRules: ['left'] },
        'zenda-pierce-r': { source: 'zenda', target: 'pierce', navigationRules: ['right'] },
        'holy-hill-walworth-l': { source: 'holy-hill', target: 'walworth', navigationRules: ['left'] },
        'walworth-pierce-lr': { source: 'walworth', target: 'pierce', navigationRules: ['left', 'right'] },
        'any-exit': {
            source: (d, c) => c,
            target: () => {
                if (callbacks.onSourceExit) callbacks.onSourceExit();
                return '';
            },
            navigationRules: ['exit']
        }
    },
    navigationRules: {
        left: { key: 'ArrowLeft', direction: 'source' },
        right: { key: 'ArrowRight', direction: 'target' },
        up: { key: 'ArrowUp', direction: 'source' },
        down: { key: 'ArrowDown', direction: 'target' },
        'drill-in': { key: 'Enter', direction: 'target' },
        'drill-out': { key: 'Backspace', direction: 'source' },
        exit: { key: 'Escape', direction: 'target' }
    }
};

export const storyStructure = {
    nodes: {
        'st-01': {
            id: 'st-01',
            renderId: 'st-01',
            edges: ['st-01-02', 'st-exit'],
            data: {},
            semantics: {
                label: 'Layer 1 of 13. The youngest, topmost glacial deposit from the end of the Pleistocene into the Holocene Epoch. Only Miller Creek is present, deposited from the N/NE.'
            },
            spatialProperties: { x: 6, y: 56, width: 459, height: 15 }
        },
        'st-02': {
            id: 'st-02',
            renderId: 'st-02',
            edges: ['st-01-02', 'st-02-03', 'st-exit'],
            data: {},
            semantics: {
                label: 'Miller Creek and Copper Falls are deposited from the N/NE and Kewaunee is deposited from the NE/E. Close to the very end of the Wisconsin glaciation during the Pleistocene Epoch. Layer 2 of 13.'
            },
            spatialProperties: { x: 6, y: 82, width: 459, height: 1 }
        },
        'st-03': {
            id: 'st-03',
            renderId: 'st-03',
            edges: ['st-02-03', 'st-03-04', 'st-exit'],
            data: {},
            semantics: {
                label: 'Copper Falls is deposited from the N/NE and Kewaunee is deposited from the NE/E. Close to the end of the Wisconsin glaciation during the Pleistocene Epoch. Layer 3 of 13.'
            },
            spatialProperties: { x: 6, y: 89, width: 459, height: 1 }
        },
        'st-04': {
            id: 'st-04',
            renderId: 'st-04',
            edges: ['st-03-04', 'st-04-05', 'st-exit'],
            data: {},
            semantics: {
                label: 'Trade River is deposited from the W/NW, Copper Falls is deposited from the N/NE, and Kewaunee is deposited from the NE/E. In the final quarter of the Wisconsin glaciation during the Pleistocene Epoch. Layer 4 of 13.'
            },
            spatialProperties: { x: 6, y: 97, width: 459, height: 8 }
        },
        'st-05': {
            id: 'st-05',
            renderId: 'st-05',
            edges: ['st-04-05', 'st-05-06', 'st-exit'],
            data: {},
            semantics: {
                label: 'Trade River is deposited from the W/NW, Copper Falls is deposited from the N/NE, and Holy Hill and Oak Creek is deposited from the NE/E. In the later middle of the Wisconsin glaciation during the Pleistocene Epoch. Layer 5 of 13.'
            },
            spatialProperties: { x: 6, y: 116, width: 459, height: 24 }
        },
        'st-06': {
            id: 'st-06',
            renderId: 'st-06',
            edges: ['st-05-06', 'st-06-07', 'st-exit'],
            data: {},
            semantics: {
                label: 'Copper Falls is deposited from the N/NE and Holy Hill is deposited from the NE/E. In the earlier middle of the Wisconsin glaciation during the Pleistocene Epoch. Layer 6 of 13.'
            },
            spatialProperties: { x: 6, y: 152, width: 459, height: 31 }
        },
        'st-07': {
            id: 'st-07',
            renderId: 'st-07',
            edges: ['st-06-07', 'st-07-08', 'st-exit'],
            data: {},
            semantics: {
                label: 'Copper Falls is deposited from the N/NE and Holy Hill and Zenda is deposited from the NE/E. Close to the start of the Wisconsin glaciation during the Pleistocene Epoch. Layer 7 of 13.'
            },
            spatialProperties: { x: 6, y: 194, width: 459, height: 1 }
        },
        'st-08': {
            id: 'st-08',
            renderId: 'st-08',
            edges: ['st-07-08', 'st-08-09', 'st-exit'],
            data: {},
            semantics: {
                label: 'Copper Falls is deposited from the N/NE and Zenda is deposited from the NE/E. At the start of the Wisconsin glaciation during the Pleistocene Epoch. Layer 8 of 13.'
            },
            spatialProperties: { x: 6, y: 202, width: 459, height: 12 }
        },
        'st-09': {
            id: 'st-09',
            renderId: 'st-09',
            edges: ['st-08-09', 'st-09-10', 'st-exit'],
            data: {},
            semantics: {
                label: 'River Falls and Copper Falls is deposited from the N/NE and Zenda is deposited from the NE/E. At the end of the Illinoian glaciation during the Pleistocene Epoch. Layer 9 of 13.'
            },
            spatialProperties: { x: 6, y: 225, width: 459, height: 9 }
        },
        'st-10': {
            id: 'st-10',
            renderId: 'st-10',
            edges: ['st-09-10', 'st-10-11', 'st-exit'],
            data: {},
            semantics: {
                label: 'River Falls and Copper Falls is deposited from the N/NE and Walworth is deposited from the NE/E. In the middle of the Illinoian glaciation during the Pleistocene Epoch. Layer 10 of 13.'
            },
            spatialProperties: { x: 6, y: 246, width: 459, height: 1 }
        },
        'st-11': {
            id: 'st-11',
            renderId: 'st-11',
            edges: ['st-10-11', 'st-11-12', 'st-exit'],
            data: {},
            semantics: {
                label: 'Walworth is deposited from the NE/E. Near the beginning of the Illinoian glaciation during the Pleistocene Epoch. Layer 11 of 13.'
            },
            spatialProperties: { x: 6, y: 257, width: 459, height: 11 }
        },
        'st-12': {
            id: 'st-12',
            renderId: 'st-12',
            edges: ['st-11-12', 'st-12-13', 'st-exit'],
            data: {},
            semantics: { label: 'No deposits. At the start of the Illinoian glaciation. Layer 12 of 13.' },
            spatialProperties: { x: 6, y: 279, width: 459, height: 5 }
        },
        'st-13': {
            id: 'st-13',
            renderId: 'st-13',
            edges: ['st-12-13', 'st-exit'],
            data: {},
            semantics: {
                label: 'Pierce and Marathon are deposited from the NE/E. At the end of the Pre-Illinoian glaciation during the Pleistocene Epoch. Layer 13 of 13, the bottommost layer.'
            },
            spatialProperties: { x: 6, y: 295, width: 459, height: 22 }
        }
    },
    edges: {
        'st-01-02': { source: 'st-01', target: 'st-02', navigationRules: ['up', 'down'] },
        'st-02-03': { source: 'st-02', target: 'st-03', navigationRules: ['up', 'down'] },
        'st-03-04': { source: 'st-03', target: 'st-04', navigationRules: ['up', 'down'] },
        'st-04-05': { source: 'st-04', target: 'st-05', navigationRules: ['up', 'down'] },
        'st-05-06': { source: 'st-05', target: 'st-06', navigationRules: ['up', 'down'] },
        'st-06-07': { source: 'st-06', target: 'st-07', navigationRules: ['up', 'down'] },
        'st-07-08': { source: 'st-07', target: 'st-08', navigationRules: ['up', 'down'] },
        'st-08-09': { source: 'st-08', target: 'st-09', navigationRules: ['up', 'down'] },
        'st-09-10': { source: 'st-09', target: 'st-10', navigationRules: ['up', 'down'] },
        'st-10-11': { source: 'st-10', target: 'st-11', navigationRules: ['up', 'down'] },
        'st-11-12': { source: 'st-11', target: 'st-12', navigationRules: ['up', 'down'] },
        'st-12-13': { source: 'st-12', target: 'st-13', navigationRules: ['up', 'down'] },
        'st-exit': {
            source: (d, c) => c,
            target: () => {
                if (callbacks.onTimeExit) callbacks.onTimeExit();
                return '';
            },
            navigationRules: ['exit']
        }
    },
    navigationRules: {
        up: { key: 'ArrowUp', direction: 'source' },
        down: { key: 'ArrowDown', direction: 'target' },
        exit: { key: 'Escape', direction: 'target' }
    }
};
