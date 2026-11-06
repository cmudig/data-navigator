import runtimeSrc from '../runtime/dn-runtime.js?raw';
import adaptersSrc from '../runtime/adapters.js?raw';
import { version as DN } from '../../../data-navigator/package.json';
import { patternOf, type Doc, type Pattern } from '../model/doc';
import { buildVegaSpec, resolveFields } from '../utils/vegaBuilder';

export type Target = 'dom' | 'scales' | 'vega' | 'bokeh';
export type Framework = 'none' | 'react' | 'svelte';
export interface PatternOptions {
    target: Target;
    framework: Framework;
    fieldMap: Record<string, string>;
    selector: string;
    resize: boolean;
}

export const VERSIONS = {
    'data-navigator': DN,
    vega: '6',
    'vega-lite': '6',
    'vega-embed': '7',
    d3: '7',
    bokeh: '3.7.3',
    react: '19',
    svelte: '5'
};

const CSS = `#chart { position: relative; display: inline-block; }
#chart .dn-wrapper { position: absolute; top: 0; left: 0; pointer-events: none; }
#chart .dn-node { position: absolute; margin: 0; opacity: 0; pointer-events: none; outline: none; box-sizing: border-box; }
#chart .dn-node:focus, #chart .dn-node.dn-current { opacity: 1; pointer-events: auto; }
#chart .dn-node-svg { position: absolute; overflow: visible; pointer-events: none; }
#chart .dn-node-path { fill: none; stroke: #1b1b1b; stroke-width: 3; paint-order: stroke; }
#chart .dn-exit-position { position: absolute; bottom: 8px; left: 8px; }`;

const head = (title: string, extra = '') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/data-navigator@${DN}/text-chat.css" />
<style>
${CSS}
</style>
<script type="importmap">{ "imports": { "data-navigator": "https://cdn.jsdelivr.net/npm/data-navigator@${DN}/dist/index.js" } }</script>
${extra}</head>`;

const json = (v: unknown) => JSON.stringify(v, null, 1);
const stripRow = (row: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(row ?? {}).filter(([k]) => !k.startsWith('_dn')));

export function literalFiles(doc: Doc, structure: any, entry: string | null) {
    const nodes: Record<string, unknown> = {};
    for (const [id, n] of Object.entries<any>(structure.nodes))
        nodes[id] = {
            id,
            renderId: n.renderId || id,
            edges: n.edges,
            ...(n.dimensionLevel !== undefined ? { dimensionLevel: n.dimensionLevel } : { data: stripRow(n.data) }),
            semantics: n.semantics,
            spatialProperties: n.spatialProperties,
            ...(n.cssClass ? { cssClass: n.cssClass } : {})
        };
    const edges = Object.fromEntries(
        Object.entries<any>(structure.edges).map(([id, e]) => [
            id,
            { source: e.source, target: e.target, navigationRules: e.navigationRules }
        ])
    );
    const w = doc.image?.width ?? 800;
    const h = doc.image?.height ?? 600;
    const ext = doc.image?.url.match(/^data:image\/(\w+)/)?.[1]?.replace('svg+xml', 'svg') ?? 'png';
    const files: Record<string, string | Uint8Array> = {
        'structure.json': json({ entry, nodes, edges, navigationRules: structure.navigationRules }),
        'dn-runtime.js': runtimeSrc,
        'index.html': `${head(doc.chart.description || 'Accessible chart')}
<body>
<div id="frame" style="max-width: ${w}px">
  <div id="chart" style="width: ${w}px; height: ${h}px; transform-origin: top left">
    ${doc.image ? `<img src="chart.${ext}" alt="" width="${w}" height="${h}" />` : ''}
  </div>
</div>
<div id="chat"></div>
<script type="module">
import { mount } from './dn-runtime.js';
const structure = await (await fetch('./structure.json')).json();
const frame = document.getElementById('frame');
const chart = document.getElementById('chart');
const fit = () => {
  const k = Math.min(1, frame.clientWidth / ${w});
  chart.style.transform = 'scale(' + k + ')';
  frame.style.height = ${h} * k + 'px';
};
new ResizeObserver(fit).observe(frame);
const nav = mount({ structure, container: chart, entry: structure.entry, chat: document.getElementById('chat') });
</script>
</body>
</html>
`
    };
    if (doc.image) files[`chart.${ext}`] = Uint8Array.from(atob(doc.image.url.split(',')[1]), c => c.charCodeAt(0));
    return files;
}

export function generalize(doc: Doc, structure: any, fieldMap: Record<string, string>) {
    const p = structuredClone(patternOf(doc)) as Pattern;
    const leaf = (id: string) =>
        structure.nodes[id] && structure.nodes[id].dimensionLevel === undefined && !structure.nodes[id].manual;
    const dropped: string[] = [];
    const ov = p.overrides;
    for (const [id, o] of Object.entries(ov.nodes)) {
        if (leaf(id)) {
            delete ov.nodes[id];
            dropped.push(`Edits to data point ${id}`);
        } else if (o.geo) {
            delete o.geo;
            dropped.push(`Pinned position of ${id} (positions come from your chart)`);
        }
    }
    for (const id of Object.keys(ov.edges)) {
        const e = structure.edges[id];
        if (!e || leaf(e.source) || leaf(e.target)) {
            delete ov.edges[id];
            dropped.push(`Edits to edge ${id}`);
        }
    }
    for (const [id, e] of Object.entries(ov.added.edges))
        if (leaf(e.source) || leaf(e.target)) {
            delete ov.added.edges[id];
            dropped.push(`Manual edge ${id} (it touches a data point)`);
        }
    const W = doc.image?.width ?? 800;
    const H = doc.image?.height ?? 600;
    for (const a of Object.values(ov.added.nodes))
        a.geo = {
            x: a.geo.x / W,
            y: a.geo.y / H,
            width: a.geo.width / W,
            height: a.geo.height / H,
            unit: 'fraction'
        } as any;
    if (p.entry && leaf(p.entry)) p.entry = null;
    const map = Object.fromEntries(Object.entries(fieldMap).filter(([k, v]) => v && v !== k));
    return { pattern: Object.keys(map).length ? { ...p, fieldMap: map } : p, dropped };
}

const MEASURE: Record<Target, (o: PatternOptions, f: Record<string, string>) => string> = {
    dom: o => `dom(chart.querySelector('svg'), { container: chart, selector: '${o.selector}', key })`,
    scales: (_o, f) => `scales({ x, y, xKey: '${f.x}', yKey: '${f.y}', mark: '${f.mark}' })`,
    vega: () => `vega(view, { key })`,
    bokeh: (_o, f) =>
        `bokeh(plotView, { container: chart, x: '${f.x}', y: '${f.y}'${f.mark === 'bar' ? `, width: 0.8, top: '${f.y}'` : ''} })`
};

function draw(target: Target, f: Record<string, string>) {
    const bar = f.mark === 'bar';
    if (target === 'vega')
        return `const spec = await (await fetch('./spec.json')).json();\nspec.data = { values: rows };\nconst { view } = await vegaEmbed(chart, spec, { actions: false, renderer: 'svg' });`;
    if (target === 'bokeh')
        return `const p = Bokeh.Plotting.figure({ width: 640, height: 400${bar ? `, x_range: [...new Set(rows.map(r => String(r['${f.x}'])))]` : ''} });
const source = new Bokeh.ColumnDataSource({ data: { x: rows.map(r => ${bar ? `String(r['${f.x}'])` : `r['${f.x}']`}), y: rows.map(r => r['${f.y}']) } });
${bar ? `p.vbar({ x: { field: 'x' }, top: { field: 'y' }, width: 0.8, source });` : `p.scatter({ x: { field: 'x' }, y: { field: 'y' }, size: 8, source });`}
const plotView = await Bokeh.Plotting.show(p, chart);`;
    const scaleCode = `const width = 640, height = 400, m = 40;
const x = ${bar ? `d3.scaleBand(rows.map(r => r['${f.x}']), [m, width - m]).padding(0.2)` : `d3.scaleLinear(d3.extent(rows, r => +r['${f.x}']), [m, width - m])`};
const y = d3.scaleLinear([${bar ? 0 : `d3.min(rows, r => +r['${f.y}'])`}, d3.max(rows, r => +r['${f.y}'])], [height - m, m]);`;
    if (target === 'scales')
        return `${scaleCode}
const canvas = Object.assign(document.createElement('canvas'), { width, height });
chart.append(canvas);
const ctx = canvas.getContext('2d');
for (const r of rows) ${bar ? `ctx.fillRect(x(r['${f.x}']), y(+r['${f.y}']), x.bandwidth(), y(0) - y(+r['${f.y}']))` : `ctx.beginPath(), ctx.arc(x(+r['${f.x}']), y(+r['${f.y}']), 4, 0, 7), ctx.fill()`};`;
    return `${scaleCode}
const svg = d3.select(chart).append('svg').attr('width', width).attr('height', height);
svg.selectAll('${bar ? 'rect' : 'circle'}').data(rows).join('${bar ? 'rect' : 'circle'}')
  .attr('data-dn-key', key)
  ${bar ? `.attr('x', r => x(r['${f.x}'])).attr('y', r => y(+r['${f.y}'])).attr('width', x.bandwidth()).attr('height', r => y(0) - y(+r['${f.y}']))` : `.attr('cx', r => x(+r['${f.x}'])).attr('cy', r => y(+r['${f.y}'])).attr('r', 4)`};`;
}

const SCRIPTS: Record<Target, string> = {
    dom: `<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>\n`,
    scales: `<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>\n`,
    vega:
        ['vega@6', 'vega-lite@6', 'vega-embed@7']
            .map(p => `<script src="https://cdn.jsdelivr.net/npm/${p}"></script>`)
            .join('\n') + '\n',
    bokeh:
        ['bokeh', 'bokeh-api']
            .map(p => `<script src="https://cdn.bokeh.org/bokeh/release/${p}-${VERSIONS.bokeh}.min.js"></script>`)
            .join('\n') + '\n'
};

export function patternFiles(doc: Doc, structure: any, o: PatternOptions) {
    const { pattern, dropped } = generalize(doc, structure, o.fieldMap);
    const sc = doc.scaffold ? resolveFields(doc.scaffold, doc) : null;
    const dims = doc.recipe.dimensions;
    const f = {
        x: sc?.xField ?? dims[0]?.key ?? 'x',
        y: sc?.yField ?? doc.data.fields.find(x => x.type === 'numerical')?.key ?? 'y',
        mark: (sc?.chartType ?? doc.chart.type) === 'scatter' ? 'point' : 'bar'
    };
    const measure = MEASURE[o.target](o, f);
    const adapter = o.target === 'scales' ? 'scales' : o.target;
    const files: Record<string, string> = {
        'pattern.json': json(pattern),
        'dn-runtime.js': runtimeSrc,
        'adapters.js': adaptersSrc,
        'data.json': json((doc.data.rows ?? []).map(stripRow))
    };
    if (o.target === 'vega' && sc) {
        const { config, background, padding, autosize, ...spec } = buildVegaSpec(sc, []);
        Object.assign(spec, { width: 640, height: 400 });
        files['spec.json'] = json(spec);
    }
    const connectArgs = `pattern, rows, container: chart, chat: document.getElementById('chat'), resize: ${o.resize}, measure: () => ${measure}()`;
    if (o.framework === 'none')
        files['index.html'] = `${head(doc.chart.description || 'Accessible chart', SCRIPTS[o.target])}
<body>
<div id="chart"></div>
<div id="chat"></div>
<script type="module">
import { connect, matchKey } from './dn-runtime.js';
import { ${adapter} } from './adapters.js';
const pattern = await (await fetch('./pattern.json')).json();
const rows = await (await fetch('./data.json')).json();
const chart = document.getElementById('chart');
const key = matchKey(pattern);
${draw(o.target, f)}
const nav = connect({ ${connectArgs} });
// After your chart re-renders, call nav.refresh(). With new rows, call nav.setData(rows).
</script>
</body>
</html>
`;
    if (o.framework === 'react') {
        files['useDataNavigator.js'] = `import { useEffect, useRef } from 'react';
import { connect } from './dn-runtime.js';

export function useDataNavigator({ pattern, rows, measure, chat, resize = ${o.resize} }) {
  const ref = useRef(null);
  const nav = useRef(null);
  useEffect(() => {
    nav.current = connect({ pattern, rows, container: ref.current, chat: chat?.current, resize, measure: () => measure(ref.current)() });
    return () => nav.current.destroy();
  }, [pattern]);
  useEffect(() => nav.current?.setData(rows), [rows]);
  return [ref, nav];
}
`;
        files['Chart.jsx'] = `import { useRef } from 'react';
import { useDataNavigator } from './useDataNavigator.js';
import { matchKey } from './dn-runtime.js';
import { dom } from './adapters.js';

export default function Chart({ pattern, rows, width = 640, height = 400 }) {
  const key = matchKey(pattern);
  const chat = useRef(null);
  const [ref] = useDataNavigator({ pattern, rows, chat, measure: chart => dom(chart.querySelector('svg'), { container: chart, key }) });
  const max = Math.max(...rows.map(r => +r['${f.y}']));
  const band = width / rows.length;
  return (
    <>
      <div ref={ref} style={{ position: 'relative' }}>
        <svg width={width} height={height}>
          {rows.map((r, i) => (
            <rect key={key(r)} data-dn-key={key(r)} x={i * band + 4} width={band - 8} y={height - (r['${f.y}'] / max) * height} height={(r['${f.y}'] / max) * height} />
          ))}
        </svg>
      </div>
      <div ref={chat} />
    </>
  );
}
`;
    }
    if (o.framework === 'svelte') {
        files['dataNavigator.js'] = `import { connect } from './dn-runtime.js';

export function dataNavigator(node, params) {
  let nav = connect({ ...params, container: node, resize: params.resize ?? ${o.resize}, measure: () => params.measure(node)() });
  return {
    update(next) {
      if (next.pattern !== params.pattern) {
        nav.destroy();
        nav = connect({ ...next, container: node, measure: () => next.measure(node)() });
      } else nav.setData(next.rows);
      params = next;
    },
    destroy: () => nav.destroy()
  };
}
`;
        files['Chart.svelte'] = `<script>
  import { dataNavigator } from './dataNavigator.js';
  import { matchKey } from './dn-runtime.js';
  import { dom } from './adapters.js';

  let { pattern, rows, width = 640, height = 400 } = $props();
  let chat = $state();
  const key = $derived(matchKey(pattern));
  const max = $derived(Math.max(...rows.map(r => +r['${f.y}'])));
  const band = $derived(width / rows.length);
</script>

{#if chat}
  <div style="position: relative" use:dataNavigator={{ pattern, rows, chat, measure: chart => dom(chart.querySelector('svg'), { container: chart, key }) }}>
    <svg {width} {height}>
      {#each rows as r, i (key(r))}
        <rect data-dn-key={key(r)} x={i * band + 4} width={band - 8} y={height - (r['${f.y}'] / max) * height} height={(r['${f.y}'] / max) * height} />
      {/each}
    </svg>
  </div>
{/if}
<div bind:this={chat}></div>
`;
    }
    return { files, dropped, pattern };
}
