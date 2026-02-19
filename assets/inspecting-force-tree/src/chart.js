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
        uniqueID: 'two-trees-bar-chart',
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

export function updateChartHighlight(barChart, node) {
    if (!node.derivedNode) {
        barChart.clickHighlight = [{ id: node.data.id }];
        barChart.interactionKeys = ['id'];
    } else if (node.data?.dimensionKey) {
        barChart.clickHighlight = [{ selectAll: 'yes' }];
        barChart.interactionKeys = ['selectAll'];
    } else {
        const key = node.derivedNode;
        const value = node.data?.[key];
        barChart.clickHighlight = [{ [key]: value }];
        barChart.interactionKeys = [key];
    }
}

export function clearChartHighlight(barChart) {
    barChart.clickHighlight = [];
}
