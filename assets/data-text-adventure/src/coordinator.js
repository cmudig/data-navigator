import { structure, data } from './structure.js';
import { createChart, updateChartHighlight, clearChartHighlight } from './chart.js';
import dataNavigator from 'data-navigator';

// Create the Visa stacked bar chart
const stackedBar = createChart('chart-wrapper', data);

// Create the text chat interface
dataNavigator.textChat({
    structure,
    container: 'text-chat-container',
    commandLabels: {
        left: 'left across categories',
        right: 'right across categories',
        up: 'up across dates',
        down: 'down across dates',
        child: 'drill in',
        parent: 'back out',
        exit: 'exit navigation'
    },
    onNavigate: (node) => {
        updateChartHighlight(stackedBar, node);
    },
    onExit: () => {
        clearChartHighlight(stackedBar);
    }
});
