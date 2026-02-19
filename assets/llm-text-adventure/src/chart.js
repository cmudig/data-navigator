// Creates a Visa stacked bar chart web component inside the given container.
export function createChart(containerId, data) {
    const wrapper = document.getElementById(containerId);
    const stackedBar = document.createElement('stacked-bar-chart');
    const props = {
        mainTitle: '',
        subTitle: '',
        data,
        height: 200,
        width: 250,
        padding: { top: 10, bottom: 10, right: 10, left: 30 },
        colors: ['#FFFFFF', '#DDDDDD', '#BBBBBB', '#999999'],
        ordinalAccessor: 'category',
        valueAccessor: 'value',
        groupAccessor: 'date',
        uniqueID: 'llm-adventure-stacked-bar',
        legend: { labels: ['A', 'B', 'C', 'Other'] },
        dataLabel: { visible: false },
        yAxis: { visible: true, gridVisible: false },
        xAxis: { label: '', visible: false },
        showTotalValue: false,
        suppressEvents: true,
        layout: 'horizontal',
        clickHighlight: [],
        clickStyle: { color: '#222', strokeWidth: 1 },
        interactionKeys: [],
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
        stackedBar[prop] = props[prop];
    });
    wrapper.appendChild(stackedBar);
    return stackedBar;
}

// Highlights bars on the chart based on the current node type.
export function updateChartHighlight(stackedBar, node) {
    if (!node.derivedNode) {
        // Leaf node — highlight specific bar segment
        stackedBar.clickHighlight = [
            { category: node.data.category, date: node.data.date }
        ];
        stackedBar.interactionKeys = ['category', 'date'];
    } else if (node.data?.dimensionKey) {
        // Dimension node — highlight all bars
        stackedBar.clickHighlight = [{ selectAll: 'yes' }];
        stackedBar.interactionKeys = ['selectAll'];
    } else {
        // Division node — highlight group
        const key = node.derivedNode;
        const value = node.data?.[key];
        stackedBar.clickHighlight = [{ [key]: value }];
        stackedBar.interactionKeys = [key];
    }
}

export function clearChartHighlight(stackedBar) {
    stackedBar.clickHighlight = [];
}
