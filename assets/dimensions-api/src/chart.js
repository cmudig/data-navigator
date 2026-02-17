// Creates a Visa line chart web component inside the given container.
export function createChart(containerId, data) {
    const wrapper = document.getElementById(containerId);
    const lineChart = document.createElement('line-chart');
    const props = {
        mainTitle: '',
        subTitle: '',
        data,
        height: 200,
        width: 450,
        padding: { top: 10, bottom: 30, right: 0, left: 20 },
        colors: ['#999999', '#BBBBBB', '#DDDDDD', '#FFFFFF'],
        ordinalAccessor: 'date',
        seriesLabel: { visible: false },
        valueAccessor: 'value',
        seriesAccessor: 'category',
        uniqueID: 'examples-line-chart',
        dataLabel: { visible: false },
        legend: { visible: false },
        yAxis: { visible: true, gridVisible: false },
        xAxis: { visible: true, label: '' },
        suppressEvents: true,
        clickHighlight: [],
        clickStyle: { color: '#222', strokeWidth: 2 },
        interactionKeys: [],
        strokeWidth: 1,
        accessibility: {
            elementsAreInterface: false,
            disableValidation: true,
            hideDataTableButton: true,
            keyboardNavConfig: { disabled: true },
            hideTextures: true,
            hideStrokes: false
        }
    };
    Object.keys(props).forEach(prop => {
        lineChart[prop] = props[prop];
    });
    wrapper.appendChild(lineChart);
    return lineChart;
}

// Highlights lines/points based on the current node type.
export function updateChartHighlight(lineChart, node) {
    if (!node.derivedNode) {
        // Leaf node — highlight specific data point
        lineChart.clickHighlight = [
            { category: node.data.category, date: node.data.date }
        ];
        lineChart.interactionKeys = ['category', 'date'];
    } else if (node.data?.dimensionKey) {
        // Dimension node — highlight all lines
        lineChart.clickHighlight = [{ selectAll: 'yes' }];
        lineChart.interactionKeys = ['selectAll'];
    } else {
        // Division node — highlight group
        const key = node.derivedNode;
        const value = node.data?.[key];
        lineChart.clickHighlight = [{ [key]: value }];
        lineChart.interactionKeys = [key];
    }
}

export function clearChartHighlight(lineChart) {
    lineChart.clickHighlight = [];
}
