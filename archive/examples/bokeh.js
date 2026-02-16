export const plot = (id, focusData) => {
    const stores = ['a', 'b'];
    const plt = Bokeh.Plotting;

    const p = plt.figure({
        x_range: stores,
        y_range: [0, 5.5],
        height: 300,
        width: 300,
        title: 'Fruit cost by store',
        output_backend: 'svg',
        toolbar_location: null,
        tools: ''
    });

    p.vbar({
        x: stores,
        top: [3, 2.75],
        bottom: [0, 0],
        width: 0.8,
        color: ['#FCB5B6', '#FCB5B6'],
        line_color: ['#8F0002', '#8F0002']
    });

    p.vbar({
        x: stores,
        top: [3.75, 4],
        bottom: [3, 2.75],
        width: 0.8,
        color: ['#F9E782', '#F9E782'],
        line_color: ['#766500', '#766500']
    });

    if (focusData) {
        p.vbar({
            x: stores,
            top: focusData.top,
            bottom: focusData.bottom,
            width: 0.8,
            line_width: 3,
            color: ['none', 'none'],
            line_color: focusData.line_color
        });
    }

    const r1 = p.square([-10000], [-10000], { color: '#FCB5B6', line_color: '#8F0002' });
    const r2 = p.square([-10000], [-10000], { color: '#F9E782', line_color: '#766500' });

    const legend_items = [
        new Bokeh.LegendItem({ label: 'apple', renderers: [r1] }),
        new Bokeh.LegendItem({ label: 'banana', renderers: [r2] })
    ];
    const legend = new Bokeh.Legend({ items: legend_items, location: 'top_left', orientation: 'horizontal' });
    p.add_layout(legend);

    plt.show(p, `#${id}`);
    const plotToHide = document.getElementById(id);
    if (plotToHide) {
        plotToHide.inert = true; //we need to do this in order to disable the bad accessibility bokeh currently has
    }
    const wrapper = document.getElementById(`${id}-wrapper`);
    wrapper.setAttribute(
        'aria-label',
        'Fruit cost by store. Bokeh stacked bar chart. Store a: Apple 3, Banana 0.75. Store b: Apple 2.75, Banana 1.25.'
    );
};
