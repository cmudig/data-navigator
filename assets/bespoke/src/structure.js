// All spatial coordinates use scale 1/8 of the original 4096×2821 SVG space.
// Displayed SVG is 512×353 px, so original coords ÷ 8 = CSS pixel position.
//
// Navigation model:
//   Region level  — left/right between the three columns (circular).
//   Formation level — up/down within a column; left/right to the nearest
//     formation in the adjacent column (by vertical center), wrapping circularly.

export const callbacks = { onExit: null };

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
            edges: [
                'gswnw-trade-river',
                'trade-river-pierce',
                'trade-river-miller-creek',
                'kewaunee-trade-river-wrap',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Trade River. Till unit. W/NW glacial sediment.' },
            spatialProperties: { x: 42, y: 89, width: 53, height: 32 }
        },
        pierce: {
            id: 'pierce',
            renderId: 'pierce',
            edges: [
                'gswnw-pierce-out',
                'trade-river-pierce',
                'pierce-marathon',
                'pierce-river-falls',
                'walworth-pierce-wrap',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Pierce. Till unit. W/NW glacial sediment.' },
            spatialProperties: { x: 13, y: 291, width: 53, height: 32 }
        },
        marathon: {
            id: 'marathon',
            renderId: 'marathon',
            edges: [
                'gswnw-marathon-out',
                'pierce-marathon',
                'marathon-river-falls-cross',
                'walworth-marathon-wrap',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Marathon. Till unit. W/NW glacial sediment.' },
            spatialProperties: { x: 70, y: 291, width: 53, height: 32 }
        },
        'miller-creek': {
            id: 'miller-creek',
            renderId: 'miller-creek',
            edges: [
                'gsnne-miller-creek',
                'miller-creek-copper-falls',
                'trade-river-miller-creek',
                'miller-creek-kewaunee',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Miller Creek. Till unit. N/NE glacial sediment.' },
            spatialProperties: { x: 165, y: 52, width: 53, height: 32 }
        },
        'copper-falls': {
            id: 'copper-falls',
            renderId: 'copper-falls',
            edges: [
                'gsnne-copper-falls-out',
                'miller-creek-copper-falls',
                'copper-falls-river-falls',
                'trade-river-copper-falls-cross',
                'copper-falls-holy-hill',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Copper Falls. Till unit. N/NE glacial sediment.' },
            spatialProperties: { x: 222, y: 76, width: 53, height: 176 }
        },
        'river-falls': {
            id: 'river-falls',
            renderId: 'river-falls',
            edges: [
                'gsnne-river-falls-out',
                'copper-falls-river-falls',
                'pierce-river-falls',
                'river-falls-zenda',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'River Falls. Till unit. N/NE glacial sediment.' },
            spatialProperties: { x: 166, y: 220, width: 53, height: 32 }
        },
        kewaunee: {
            id: 'kewaunee',
            renderId: 'kewaunee',
            edges: [
                'gsnee-kewaunee',
                'kewaunee-oak-creek',
                'miller-creek-kewaunee',
                'kewaunee-trade-river-wrap',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Kewaunee. Till unit. NE/E glacial sediment.' },
            spatialProperties: { x: 306, y: 76, width: 94, height: 32 }
        },
        'oak-creek': {
            id: 'oak-creek',
            renderId: 'oak-creek',
            edges: [
                'gsnee-oak-creek-out',
                'kewaunee-oak-creek',
                'oak-creek-holy-hill',
                'copper-falls-oak-creek-cross',
                'oak-creek-trade-river-wrap',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Oak Creek. Till unit. NE/E glacial sediment.' },
            spatialProperties: { x: 347, y: 113, width: 53, height: 32 }
        },
        'holy-hill': {
            id: 'holy-hill',
            renderId: 'holy-hill',
            edges: [
                'gsnee-holy-hill-out',
                'oak-creek-holy-hill',
                'holy-hill-zenda',
                'copper-falls-holy-hill',
                'holy-hill-trade-river-wrap',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Holy Hill. Till unit. NE/E glacial sediment. L-shaped region.' },
            spatialProperties: {
                x: 305,
                y: 113,
                width: 95,
                height: 85,
                path: 'M343.75,112.5V148.5H400.125V197.5H304.875V112.5H343.75Z'
            }
        },
        zenda: {
            id: 'zenda',
            renderId: 'zenda',
            edges: [
                'gsnee-zenda-out',
                'holy-hill-zenda',
                'zenda-walworth',
                'river-falls-zenda',
                'zenda-pierce-wrap',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Zenda. Till unit. NE/E glacial sediment.' },
            spatialProperties: { x: 404, y: 189, width: 53, height: 50 }
        },
        walworth: {
            id: 'walworth',
            renderId: 'walworth',
            edges: [
                'gsnee-walworth-out',
                'zenda-walworth',
                'river-falls-walworth-cross',
                'walworth-pierce-wrap',
                'any-exit'
            ],
            data: {},
            semantics: { label: 'Walworth. Till unit. NE/E glacial sediment.' },
            spatialProperties: { x: 404, y: 242, width: 53, height: 32 }
        }
    },
    edges: {
        // Top-level: 3 regions, circular left/right
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
        // Drill-in to first (topmost) child + drill-out from that child
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
        // Drill-out from non-first children (source direction returns parent)
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
        // Within-column up/down (top of column = up/source, bottom = down/target)
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
        // Cross-column left/right: each formation targets its closest counterpart
        // by vertical center in the adjacent column. Columns wrap circularly.
        //
        // Adjacent pairs (bidirectional): one edge handles both directions.
        'trade-river-miller-creek': {
            source: 'trade-river',
            target: 'miller-creek',
            navigationRules: ['left', 'right']
        },
        'pierce-river-falls': { source: 'pierce', target: 'river-falls', navigationRules: ['left', 'right'] },
        'miller-creek-kewaunee': { source: 'miller-creek', target: 'kewaunee', navigationRules: ['left', 'right'] },
        'copper-falls-holy-hill': { source: 'copper-falls', target: 'holy-hill', navigationRules: ['left', 'right'] },
        'river-falls-zenda': { source: 'river-falls', target: 'zenda', navigationRules: ['left', 'right'] },
        // Wrap pairs (NE/E ↔ W/NW): bidirectional where both sides share the same closest target.
        'kewaunee-trade-river-wrap': { source: 'kewaunee', target: 'trade-river', navigationRules: ['left', 'right'] },
        'walworth-pierce-wrap': { source: 'walworth', target: 'pierce', navigationRules: ['left', 'right'] },
        // One-directional cross edges: used when the reverse would land on a different target.
        'marathon-river-falls-cross': { source: 'marathon', target: 'river-falls', navigationRules: ['right'] },
        'oak-creek-trade-river-wrap': { source: 'oak-creek', target: 'trade-river', navigationRules: ['right'] },
        'holy-hill-trade-river-wrap': { source: 'holy-hill', target: 'trade-river', navigationRules: ['right'] },
        'zenda-pierce-wrap': { source: 'zenda', target: 'pierce', navigationRules: ['right'] },
        'walworth-marathon-wrap': { source: 'walworth', target: 'marathon', navigationRules: ['left'] },
        'trade-river-copper-falls-cross': { source: 'trade-river', target: 'copper-falls', navigationRules: ['left'] },
        'copper-falls-oak-creek-cross': { source: 'copper-falls', target: 'oak-creek', navigationRules: ['left'] },
        'river-falls-walworth-cross': { source: 'river-falls', target: 'walworth', navigationRules: ['left'] },
        // Exit
        'any-exit': {
            source: (d, c) => c,
            target: () => {
                if (callbacks.onExit) callbacks.onExit();
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
