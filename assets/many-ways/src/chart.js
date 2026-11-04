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

    // each browser is named beside the last column, so the labels set the right margin
    const labels = svg.append('g').attr('class', 'mw-labels');
    const texts = stacks.map(name => labels.append('text').text(name));
    const labelWidth = Math.max(...texts.map(t => t.node().getComputedTextLength()));

    const margin = { top: 16, right: labelWidth + 24, bottom: 36, left: 48 };
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
                    index: series.index,
                    x: x(years[i]),
                    y: y(y1),
                    width: x.bandwidth(),
                    height: y(y0) - y(y1)
                };
            })
        );

    // outlines sit inside each segment, with a 2px gap between segments
    svg.append('g')
        .selectAll('rect')
        .data(Object.values(bars))
        .join('rect')
        .attr('class', d => `mw-bar mw-c${d.index}`)
        .attr('x', d => d.x + 0.5)
        .attr('y', d => d.y + 0.5)
        .attr('width', d => d.width - 1)
        .attr('height', d => Math.max(0.5, d.height - 1 - (d.index ? 2 : 0)));

    svg.append('g')
        .attr('class', 'mw-axis')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));

    // place the labels at their segments' middles, pushed apart where segments are thin
    const last = years[years.length - 1];
    const ends = stacks
        .map((s, i) => {
            const b = bars[`${last}-${s.toLowerCase()}`];
            return { i, y: b.y + b.height / 2 };
        })
        .sort((a, b) => a.y - b.y);
    ends.forEach((e, k) => k && (e.y = Math.max(e.y, ends[k - 1].y + 14)));
    ends.forEach(e => texts[e.i].attr('x', x(last) + x.bandwidth() + 8).attr('y', e.y + 4));
    labels.raise();
    const labelBox = labels.node().getBBox();

    return {
        bars,
        boxes: {
            chart: { x: 2, y: 2, width: width - 4, height: height - 4 },
            xAxis: { x: margin.left, y: height - margin.bottom, width: width - margin.left - margin.right, height: 28 },
            labels: { x: labelBox.x, y: labelBox.y, width: labelBox.width, height: labelBox.height }
        }
    };
}
