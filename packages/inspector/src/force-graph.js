// Copyright 2021-2024 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
// Adapted for data-navigator-inspector with modular D3 imports.

import { map, sort } from 'd3-array';
import { drag } from 'd3-drag';
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force';
import { scaleOrdinal } from 'd3-scale';
import { schemeTableau10 } from 'd3-scale-chromatic';
import { create } from 'd3-selection';

export function ForceGraph(
    {
        nodes, // an iterable of node objects (typically [{id}, …])
        links // an iterable of link objects (typically [{source, target}, …])
    },
    {
        nodeId = d => d.id,
        nodeGroup,
        nodeGroups,
        nodeTitle,
        nodeFill = 'currentColor',
        nodeStroke = '#fff',
        nodeStrokeWidth = 1.5,
        nodeStrokeOpacity = 1,
        nodeRadius = 5,
        nodeStrength,
        linkSource = ({ source }) => source,
        linkTarget = ({ target }) => target,
        linkStroke = '#999',
        linkStrokeOpacity = 0.6,
        linkStrokeWidth = 1.5,
        linkStrokeLinecap = 'round',
        linkStrength,
        colors = schemeTableau10,
        width = 640,
        height = 400,
        invalidation,
        description,
        hide
    } = {}
) {
    // Compute values.
    const N = map(nodes, nodeId).map(intern);
    const R = typeof nodeRadius !== 'function' ? null : map(nodes, nodeRadius);
    const LS = map(links, linkSource).map(intern);
    const LT = map(links, linkTarget).map(intern);
    if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
    const T = nodeTitle == null ? null : map(nodes, nodeTitle);
    const G = nodeGroup == null ? null : map(nodes, nodeGroup).map(intern);
    const W = typeof linkStrokeWidth !== 'function' ? null : map(links, linkStrokeWidth);
    const L = typeof linkStroke !== 'function' ? null : map(links, linkStroke);

    // Replace the input nodes and links with mutable objects for the simulation.
    nodes = map(nodes, (_, i) => ({ id: N[i] }));
    links = map(links, (_, i) => ({ source: LS[i], target: LT[i] }));

    description =
        (typeof description === 'function' ? description(nodes, links) : description) ||
        `Node-link graph. Contains ${nodes.length} node${nodes.length !== 1 ? 's' : ''} and ${links.length} link${
            links.length !== 1 ? 's' : ''
        }.`;

    // Compute default domains.
    if (G && nodeGroups === undefined) nodeGroups = sort(G);

    // Construct the scales.
    const color = nodeGroup == null ? null : scaleOrdinal(nodeGroups, colors);

    // Construct the forces.
    const forceNode = forceManyBody();
    const simForceLink = forceLink(links).id(({ index: i }) => N[i]);
    if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
    if (linkStrength !== undefined) simForceLink.strength(linkStrength);

    const simulation = forceSimulation(nodes)
        .force('link', simForceLink)
        .force('charge', forceNode)
        .force('center', forceCenter())
        .on('tick', ticked);

    const svg = create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [-width / 2, -height / 2, width, height])
        .attr('role', hide ? 'presentation' : 'img')
        .attr('aria-label', hide ? null : description)
        .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    const link = svg
        .append('g')
        .attr('stroke', typeof linkStroke !== 'function' ? linkStroke : null)
        .attr('stroke-opacity', linkStrokeOpacity)
        .attr('stroke-width', typeof linkStrokeWidth !== 'function' ? linkStrokeWidth : null)
        .attr('stroke-linecap', linkStrokeLinecap)
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('id', (_, i) => 'svgedge' + LS[i] + '-' + LT[i]);

    const node = svg
        .append('g')
        .attr('fill', nodeFill)
        .attr('stroke', nodeStroke)
        .attr('stroke-opacity', nodeStrokeOpacity)
        .attr('stroke-width', nodeStrokeWidth)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', nodeRadius)
        .attr('role', 'presentation')
        .call(makeDrag(simulation));

    if (W) link.attr('stroke-width', ({ index: i }) => W[i]);
    if (L) link.attr('stroke', ({ index: i }) => L[i]);
    if (G) node.attr('fill', ({ index: i }) => color(G[i]));
    if (R) node.attr('r', ({ index: i }) => R[i]);
    if (T) node.append('title').text(({ index: i }) => T[i]);
    if (invalidation != null) invalidation.then(() => simulation.stop());

    function intern(value) {
        return value !== null && typeof value === 'object' ? value.valueOf() : value;
    }

    function ticked() {
        link.attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node.attr('cx', d => {
            // Keep nodes within the svg bounds
            let limit = width / 2 - nodeRadius;
            if (d.x > limit || d.x < -limit) {
                return limit;
            }
            return d.x;
        }).attr('cy', d => {
            let limit = height / 2 - nodeRadius;
            if (d.y > limit || d.y < -limit) {
                return limit;
            }
            return d.y;
        });
    }

    function makeDrag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
    }

    return Object.assign(svg.node(), { scales: { color } });
}
