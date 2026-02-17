// Creates a Visa bar chart web component inside the given container.
export function createChart(containerId, data) {
    const chartArea = document.getElementById(containerId);
    const barChart = document.createElement('bar-chart');
    const props = {
        mainTitle: '',
        subTitle: '',
        data,
        height: 200,
        width: 250,
        padding: { top: 10, bottom: 35, right: 10, left: 30 },
        colors: ['#DDD', '#999999'],
        ordinalAccessor: 'id',
        valueAccessor: 'num',
        groupAccessor: 'cat',
        sortOrder: 'asc',
        uniqueID: 'inspector-bar-chart',
        dataLabel: { visible: false },
        clickHighlight: [],
        clickStyle: { color: '#222', strokeWidth: 1 },
        interactionKeys: [],
        yAxis: { visible: false, gridVisible: false },
        xAxis: { visible: true },
        suppressEvents: true,
        layout: 'vertical',
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
        barChart[prop] = props[prop];
    });
    chartArea.appendChild(barChart);
    return barChart;
}

// Highlights bars on the chart based on the current node type.
export function updateChartHighlight(barChart, node) {
    if (!node.derivedNode) {
        // Leaf node — highlight specific bar
        barChart.clickHighlight = [{ id: node.data.id }];
        barChart.interactionKeys = ['id'];
    } else if (node.data?.dimensionKey) {
        // Dimension node — highlight all bars
        barChart.clickHighlight = [{ selectAll: 'yes' }];
        barChart.interactionKeys = ['selectAll'];
    } else {
        // Division node — highlight group
        const key = node.derivedNode;
        const value = node.data?.[key];
        barChart.clickHighlight = [{ [key]: value }];
        barChart.interactionKeys = [key];
    }
}

export function clearChartHighlight(barChart) {
    barChart.clickHighlight = [];
}
