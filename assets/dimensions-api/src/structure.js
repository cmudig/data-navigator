import dataNavigator from 'data-navigator';

const createValidId = s => '_' + s.replace(/[^a-zA-Z0-9_-]+/g, '_');

export const data = [
    { date: 'Jan', category: 'Group A', value: 120, count: 420, selectAll: 'yes' },
    { date: 'Feb', category: 'Group A', value: 121, count: 439, selectAll: 'yes' },
    { date: 'Mar', category: 'Group A', value: 119, count: 402, selectAll: 'yes' },
    { date: 'Apr', category: 'Group A', value: 114, count: 434, selectAll: 'yes' },
    { date: 'May', category: 'Group A', value: 102, count: 395, selectAll: 'yes' },
    { date: 'Jun', category: 'Group A', value: 112, count: 393, selectAll: 'yes' },
    { date: 'Jul', category: 'Group A', value: 130, count: 445, selectAll: 'yes' },
    { date: 'Aug', category: 'Group A', value: 124, count: 456, selectAll: 'yes' },
    { date: 'Sep', category: 'Group A', value: 119, count: 355, selectAll: 'yes' },
    { date: 'Oct', category: 'Group A', value: 106, count: 464, selectAll: 'yes' },
    { date: 'Nov', category: 'Group A', value: 123, count: 486, selectAll: 'yes' },
    { date: 'Dec', category: 'Group A', value: 133, count: 491, selectAll: 'yes' },
    { date: 'Jan', category: 'Group B', value: 89, count: 342, selectAll: 'yes' },
    { date: 'Feb', category: 'Group B', value: 93, count: 434, selectAll: 'yes' },
    { date: 'Mar', category: 'Group B', value: 82, count: 378, selectAll: 'yes' },
    { date: 'Apr', category: 'Group B', value: 92, count: 323, selectAll: 'yes' },
    { date: 'May', category: 'Group B', value: 90, count: 434, selectAll: 'yes' },
    { date: 'Jun', category: 'Group B', value: 85, count: 376, selectAll: 'yes' },
    { date: 'Jul', category: 'Group B', value: 88, count: 404, selectAll: 'yes' },
    { date: 'Aug', category: 'Group B', value: 84, count: 355, selectAll: 'yes' },
    { date: 'Sep', category: 'Group B', value: 90, count: 432, selectAll: 'yes' },
    { date: 'Oct', category: 'Group B', value: 80, count: 455, selectAll: 'yes' },
    { date: 'Nov', category: 'Group B', value: 92, count: 445, selectAll: 'yes' },
    { date: 'Dec', category: 'Group B', value: 97, count: 321, selectAll: 'yes' },
    { date: 'Jan', category: 'Group C', value: 73, count: 456, selectAll: 'yes' },
    { date: 'Feb', category: 'Group C', value: 74, count: 372, selectAll: 'yes' },
    { date: 'Mar', category: 'Group C', value: 68, count: 323, selectAll: 'yes' },
    { date: 'Apr', category: 'Group C', value: 66, count: 383, selectAll: 'yes' },
    { date: 'May', category: 'Group C', value: 72, count: 382, selectAll: 'yes' },
    { date: 'Jun', category: 'Group C', value: 70, count: 365, selectAll: 'yes' },
    { date: 'Jul', category: 'Group C', value: 74, count: 296, selectAll: 'yes' },
    { date: 'Aug', category: 'Group C', value: 68, count: 312, selectAll: 'yes' },
    { date: 'Sep', category: 'Group C', value: 75, count: 334, selectAll: 'yes' },
    { date: 'Oct', category: 'Group C', value: 66, count: 386, selectAll: 'yes' },
    { date: 'Nov', category: 'Group C', value: 85, count: 487, selectAll: 'yes' },
    { date: 'Dec', category: 'Group C', value: 89, count: 512, selectAll: 'yes' },
    { date: 'Jan', category: 'Other', value: 83, count: 432, selectAll: 'yes' },
    { date: 'Feb', category: 'Other', value: 87, count: 364, selectAll: 'yes' },
    { date: 'Mar', category: 'Other', value: 76, count: 334, selectAll: 'yes' },
    { date: 'Apr', category: 'Other', value: 86, count: 395, selectAll: 'yes' },
    { date: 'May', category: 'Other', value: 87, count: 354, selectAll: 'yes' },
    { date: 'Jun', category: 'Other', value: 77, count: 386, selectAll: 'yes' },
    { date: 'Jul', category: 'Other', value: 79, count: 353, selectAll: 'yes' },
    { date: 'Aug', category: 'Other', value: 85, count: 288, selectAll: 'yes' },
    { date: 'Sep', category: 'Other', value: 87, count: 353, selectAll: 'yes' },
    { date: 'Oct', category: 'Other', value: 76, count: 322, selectAll: 'yes' },
    { date: 'Nov', category: 'Other', value: 96, count: 412, selectAll: 'yes' },
    { date: 'Dec', category: 'Other', value: 104, count: 495, selectAll: 'yes' }
];

export const callbacks = { onExit: null };

// Two categorical dimensions create a dual hierarchy.
// Date is first (left/right), category is second (up/down).
export const structure = dataNavigator.structure({
    data,
    idKey: 'id',
    addIds: true,
    dimensions: {
        values: [
            {
                dimensionKey: 'date',
                type: 'categorical',
                behavior: {
                    extents: 'circular',
                    childmostNavigation: 'across'
                },
                operations: {
                    sortFunction: (a, b) => {
                        if (a.values) {
                            const months = [
                                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                            ];
                            let aMonth =
                                a.values[Object.keys(a.values)[0]].date ||
                                a.values[Object.keys(a.values)[0]].data?.date;
                            let bMonth =
                                b.values[Object.keys(b.values)[0]].date ||
                                b.values[Object.keys(b.values)[0]].data?.date;
                            return months.indexOf(aMonth) - months.indexOf(bMonth);
                        }
                    }
                }
            },
            {
                dimensionKey: 'category',
                type: 'categorical',
                divisionOptions: {
                    divisionNodeIds: (dimensionKey, keyValue, i) => {
                        return createValidId(dimensionKey + keyValue + i);
                    }
                },
                behavior: {
                    extents: 'circular',
                    childmostNavigation: 'across'
                }
            }
        ]
    },
    genericEdges: [
        {
            edgeId: 'any-exit',
            edge: {
                source: (_d, c) => c,
                target: () => {
                    if (callbacks.onExit) callbacks.onExit();
                    return '';
                },
                navigationRules: ['exit']
            }
        }
    ]
});

export const entryPoint = structure.dimensions[
    Object.keys(structure.dimensions)[0]
].nodeId;
