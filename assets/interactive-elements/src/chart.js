// Bokeh is loaded as a global via CDN script tags in index.html.
/* global Bokeh */

const colors = { setosa: '#e41a1c', versicolor: '#377eb8', virginica: '#4daf4a' };

let currentPlotView = null;

// Draw (or redraw) the Bokeh scatter plot.
//
// chartState: { rects, focusedGroup, focusedPoint }
//   rects       — array of { x1, x2, y1, y2, lineWidth } overlay rectangles
//   focusedGroup — species name to ring-highlight, '__all__' for all, or null
//   focusedPoint — { x, y } to ring-highlight an individual point, or null
//
// onTap(d) is called when the user clicks a data point directly on the chart.
// It must handle selection state changes; chart.js will defer a redraw automatically.
export function drawChart(containerId, data, selectedIds, chartState, bounds, onTap) {
    const { rects, focusedGroup, focusedPoint } = chartState;
    const { xMin, xMax, yMin, yMax } = bounds;

    // Refresh the global tap bridge every redraw so it always closes over
    // the latest onTap reference. CustomJS in BokehJS cannot import ES modules
    // directly, so we go through a stable window global instead.
    window.__bokehIeTap = idx => {
        const d = data[idx];
        if (!d) return;
        onTap(d);
    };

    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const plt = Bokeh.Plotting;
    const p = plt.figure({
        height: 320,
        width: 480,
        title: 'Iris: sepal length vs petal length (click to select)',
        x_axis_label: 'Sepal length (cm)',
        y_axis_label: 'Petal length (cm)',
        toolbar_location: null,
        output_backend: 'svg'
    });

    // Draw dimension/division overlay rectangles.
    for (const rect of rects) {
        p.quad({
            left: [rect.x1],
            right: [rect.x2],
            bottom: [rect.y1],
            top: [rect.y2],
            fill_alpha: 0,
            line_color: '#333',
            line_width: rect.lineWidth
        });
    }

    // Main scatter plot.
    const source = new Bokeh.ColumnDataSource({
        data: {
            x: data.map(d => d.sepal_length),
            y: data.map(d => d.petal_length),
            pt: data.map(d => d.pt),
            species: data.map(d => d.species),
            fill_color: data.map(d => colors[d.species]),
            fill_alpha: data.map(d => (selectedIds.has(d.pt) ? 1.0 : selectedIds.size > 0 ? 0.3 : 0.7))
        }
    });

    const renderer = p.scatter({
        x: { field: 'x' },
        y: { field: 'y' },
        source,
        size: 8,
        fill_color: { field: 'fill_color' },
        line_color: { field: 'fill_color' },
        line_width: 1,
        fill_alpha: { field: 'fill_alpha' }
    });

    const hover = new Bokeh.HoverTool({
        renderers: [renderer],
        tooltips: [
            ['ID', '@pt'],
            ['Species', '@species'],
            ['Sepal length', '@x{0.0}'],
            ['Petal length', '@y{0.0}']
        ]
    });
    p.add_tools(hover);

    // Draw ring indicators for selected points.
    data.filter(d => selectedIds.has(d.pt)).forEach(d => {
        p.scatter({
            marker: 'circle',
            x: [d.sepal_length],
            y: [d.petal_length],
            size: 12,
            fill_alpha: 0,
            line_color: '#000',
            line_width: 2
        });
    });

    // Draw ring indicators for the focused group.
    if (focusedGroup !== null) {
        data.forEach(d => {
            if (focusedGroup !== '__all__' && d.species !== focusedGroup) return;
            p.scatter({
                marker: 'circle',
                x: [d.sepal_length],
                y: [d.petal_length],
                size: 11,
                fill_alpha: 0,
                line_color: colors[d.species],
                line_width: 2
            });
        });
    }

    // Draw ring indicator for the focused individual point.
    if (focusedPoint) {
        p.scatter({
            marker: 'circle',
            x: [focusedPoint.x],
            y: [focusedPoint.y],
            size: 14,
            fill_alpha: 0,
            line_color: '#333',
            line_width: 2.5
        });
    }

    const tap = new Bokeh.TapTool({
        renderers: [renderer],
        callback: new Bokeh.CustomJS({
            args: { source },
            code: `
                const idx = source.selected.indices[0];
                if (idx !== undefined) window.__bokehIeTap(idx);
            `
        })
    });
    p.add_tools(tap);
    p.toolbar.active_tap = tap;

    plt.show(p, '#' + containerId).then(v => {
        if (currentPlotView) {
            try {
                currentPlotView.remove();
            } catch (_) {}
            currentPlotView = null;
        }
        currentPlotView = v;
    });
}
