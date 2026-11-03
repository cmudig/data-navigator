import * as d3 from 'd3';

export const years = ['2015', '2016', '2017'];
export const stacks = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Other'];
export const alt =
    'Stacked bar chart of browser share from 2015 to 2017. Chrome holds most of each year, rising from 62 to 65 percent.';

export function drawChart(host, data, { width, height = 320 }) {
    const svg = d3
        .select(host)
        .append('svg')
        .attr('class', 'mw-svg')
        .attr('width', width)
        .attr('height', height)
        .attr('role', 'img')
        .attr('aria-label', alt);

    const legend = svg.append('g').attr('class', 'mw-legend');
    let lx = 0;
    let ly = 0;
    stacks.forEach((name, i) => {
        const item = legend.append('g');
        item.append('rect').attr('class', `mw-c${i}`).attr('width', 12).attr('height', 12).attr('rx', 2);
        const label = item.append('text').attr('x', 18).attr('y', 10).text(name);
        const itemWidth = 18 + label.node().getComputedTextLength() + 16;
        if (lx + itemWidth > width - 64 && lx > 0) {
            lx = 0;
            ly += 20;
        }
        item.attr('transform', `translate(${lx},${ly})`);
        lx += itemWidth;
    });
    legend.attr('transform', 'translate(48,12)');
    const legendBox = legend.node().getBBox();

    const margin = { top: 12 + legendBox.height + 20, right: 16, bottom: 36, left: 48 };
    const x = d3.scaleBand(years, [margin.left, width - margin.right]).padding(0.3);
    const y = d3.scaleLinear([0, 100], [height - margin.bottom, margin.top]);

    svg.append('g')
        .attr('class', 'mw-axis mw-grid')
        .attr('transform', `translate(${margin.left},0)`)
        .call(
            d3
                .axisLeft(y)
                .ticks(5)
                .tickSize(-(width - margin.left - margin.right))
                .tickFormat(d => `${d}%`)
        )
        .call(g => g.select('.domain').remove());

    const rows = years.map(year => ({
        year,
        ...Object.fromEntries(data.filter(d => d.year === year).map(d => [d.browser, d.share]))
    }));
    const bars = {};
    d3.stack()
        .keys(stacks)(rows)
        .forEach(series =>
            series.forEach(([y0, y1], i) => {
                bars[`${years[i]}-${series.key.toLowerCase()}`] = {
                    key: series.key,
                    x: x(years[i]),
                    y: y(y1),
                    width: x.bandwidth(),
                    height: y(y0) - y(y1)
                };
            })
        );

    svg.append('g')
        .selectAll('rect')
        .data(Object.values(bars))
        .join('rect')
        .attr('class', d => `mw-bar mw-c${stacks.indexOf(d.key)}`)
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .attr('width', d => d.width)
        .attr('height', d => d.height);

    svg.append('g')
        .attr('class', 'mw-axis')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));

    return {
        bars,
        boxes: {
            chart: { x: 2, y: 2, width: width - 4, height: height - 4 },
            xAxis: { x: margin.left, y: height - margin.bottom, width: width - margin.left - margin.right, height: 28 },
            legend: { x: 48 + legendBox.x, y: 12 + legendBox.y, width: legendBox.width, height: legendBox.height }
        }
    };
}
